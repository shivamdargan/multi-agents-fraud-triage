import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function loadFixture(filename: string) {
  // Use absolute path to fixtures directory
  const fixturePath = path.join(__dirname, '../../../fixtures', filename);
  console.log(`Loading fixture from: ${fixturePath}`);
  const data = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(data);
}

async function main() {
  console.log('🌱 Starting database seed with fixture data...');

  // Clear existing data in correct order (respecting foreign key constraints)
  console.log('🧹 Clearing existing data...');
  await prisma.agentTrace.deleteMany();
  await prisma.evalRun.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.chargeback.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.device.deleteMany();
  await prisma.card.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.knowledgeBase.deleteMany();

  // Load and seed customers (using demo data for better experience)
  console.log('📥 Loading customers...');
  const customers = await loadFixture('demo_customers.json');
  for (const customer of customers) {
    await prisma.customer.create({
      data: {
        id: customer.id,
        name: customer.name,
        emailMasked: customer.emailMasked,
        riskFlags: customer.riskFlags || {},
      },
    });
  }
  console.log(`✅ Seeded ${customers.length} customers`);

  // Load and seed cards
  console.log('📥 Loading cards...');
  const cards = await loadFixture('demo_cards.json');
  for (const card of cards) {
    await prisma.card.create({
      data: {
        id: card.id,
        customerId: card.customerId,
        last4: card.last4,
        status: card.status || 'ACTIVE',
        network: card.network,
      },
    });
  }
  console.log(`✅ Seeded ${cards.length} cards`);

  // Load and seed devices
  console.log('📥 Loading devices...');
  const devices = await loadFixture('demo_devices.json');
  for (const device of devices) {
    await prisma.device.create({
      data: {
        id: device.id,
        customerId: device.customerId,
        deviceId: device.deviceId || device.id, // Use deviceId field
        fingerprint: device.fingerprint,
        trusted: device.trusted || false,
        lastSeen: device.lastSeen ? new Date(device.lastSeen) : new Date(),
      },
    });
  }
  console.log(`✅ Seeded ${devices.length} devices`);

  // Load and seed transactions (using demo data for better experience)
  console.log('📥 Loading transactions...');
  const transactions = await loadFixture('demo_transactions.json');
  
  // Get all devices with their deviceId to id mapping
  const allDevices = await prisma.device.findMany({
    select: { id: true, deviceId: true }
  });
  const deviceIdMap = new Map(allDevices.map(d => [d.deviceId, d.id]));
  
  // Get all cards to ensure we only reference valid cards
  const allCards = await prisma.card.findMany({
    select: { id: true, customerId: true }
  });
  const cardIdSet = new Set(allCards.map(c => c.id));
  const customerCardMap = new Map();
  allCards.forEach(card => {
    if (!customerCardMap.has(card.customerId)) {
      customerCardMap.set(card.customerId, []);
    }
    customerCardMap.get(card.customerId).push(card.id);
  });
  
  for (const transaction of transactions) {
    // Map status values to valid enum values
    let status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'FLAGGED' = 'APPROVED';
    if (transaction.status === 'COMPLETED' || transaction.status === 'APPROVED') {
      status = 'APPROVED';
    } else if (transaction.status === 'PENDING') {
      status = 'PENDING';
    } else if (transaction.status === 'FAILED' || transaction.status === 'DECLINED') {
      status = 'DECLINED';
    } else if (transaction.status === 'FLAGGED' || transaction.status === 'REVERSED') {
      status = 'FLAGGED';
    }

    // Map the deviceId from fixture to the actual device.id in the database
    const deviceId = transaction.deviceId ? deviceIdMap.get(transaction.deviceId) || null : null;
    
    // Ensure cardId exists, fallback to customer's first card if not
    let cardId = transaction.cardId;
    if (!cardIdSet.has(cardId)) {
      const customerCards = customerCardMap.get(transaction.customerId);
      cardId = customerCards?.[0] || null;
    }

    // Calculate risk score based on various factors
    let riskScore = transaction.riskScore || 0;
    if (!transaction.riskScore) {
      // High-risk MCCs
      if (['6011', '7995', '5816'].includes(transaction.mcc)) {
        riskScore += 0.3;
      }
      // Large amounts
      if (Math.abs(transaction.amount) > 1000) {
        riskScore += 0.3;
      }
      // International transactions
      if (transaction.geo?.country && transaction.geo.country !== 'US') {
        riskScore += 0.2;
      }
      // ATM withdrawals
      if (transaction.mcc === '6011') {
        riskScore += 0.2;
      }
      // Gambling
      if (transaction.mcc === '7995') {
        riskScore += 0.3;
      }
      // Cap at 1.0
      riskScore = Math.min(riskScore, 1.0);
    }

    // Make transactions more recent - within last 2 days for demo freshness
    const originalDate = new Date(transaction.timestamp);
    const hoursAgo = Math.floor(Math.random() * 48); // Random hour within last 2 days
    const minutesAgo = Math.floor(Math.random() * 60); // Random minutes
    const recentDate = new Date();
    recentDate.setHours(recentDate.getHours() - hoursAgo);
    recentDate.setMinutes(recentDate.getMinutes() - minutesAgo);
    
    await prisma.transaction.create({
      data: {
        id: transaction.id,
        customerId: transaction.customerId,
        cardId: cardId,
        mcc: transaction.mcc,
        merchant: transaction.merchant,
        amount: transaction.amount,
        currency: transaction.currency || 'USD',
        timestamp: recentDate,
        deviceId: deviceId,
        geo: transaction.geo || {},
        riskScore: riskScore,
        status: status,
      },
    });
  }
  console.log(`✅ Seeded ${transactions.length} transactions`);

  // Load and seed knowledge base
  console.log('📥 Loading knowledge base documents...');
  const kbDocs = await loadFixture('kb_docs.json');
  for (const doc of kbDocs) {
    // Generate content from chunks if not provided
    const content = doc.content || (doc.chunks ? doc.chunks.join('\n\n') : '');
    
    await prisma.knowledgeBase.create({
      data: {
        id: doc.id,
        anchor: doc.anchor || doc.id,
        title: doc.title,
        content: content,
        chunks: doc.chunks || [],
        tags: doc.tags || [],
      },
    });
  }
  console.log(`✅ Seeded ${kbDocs.length} knowledge base documents`);

  // Generate more alerts for better demo experience
  console.log('🚨 Generating alerts for high-risk transactions...');
  const highRiskTransactions = await prisma.transaction.findMany({
    where: {
      riskScore: {
        gte: 0.5, // Lower threshold for more demo alerts
      },
    },
    take: 30, // More alerts for demo
  });

  let alertCount = 0;
  for (const transaction of highRiskTransactions) {
    await prisma.alert.create({
      data: {
        customerId: transaction.customerId,
        type: 'FRAUD',
        severity: transaction.riskScore! > 0.85 ? 'CRITICAL' : transaction.riskScore! > 0.75 ? 'HIGH' : 'MEDIUM',
        riskScore: transaction.riskScore!,
        reasons: [
          'High risk score detected',
          `Transaction amount: ${Math.abs(transaction.amount.toNumber())} ${transaction.currency}`,
          `Merchant: ${transaction.merchant}`,
          transaction.mcc === '6011' ? 'ATM withdrawal outside normal pattern' : null,
          transaction.mcc === '7995' ? 'Gambling transaction detected' : null,
          transaction.riskScore! > 0.8 ? 'Multiple risk factors combined' : null,
        ].filter(Boolean),
        status: 'PENDING',
        metadata: {
          transactionId: transaction.id,
          cardId: transaction.cardId,
          amount: transaction.amount.toNumber(),
          merchant: transaction.merchant,
          mcc: transaction.mcc,
          timestamp: transaction.timestamp.toISOString(),
        },
      },
    });
    alertCount++;
  }
  console.log(`✅ Generated ${alertCount} alerts`);

  console.log('🎉 Database seeding completed successfully!');
  
  // Print summary
  const customerCount = await prisma.customer.count();
  const cardCount = await prisma.card.count();
  const transactionCount = await prisma.transaction.count();
  const alertCount2 = await prisma.alert.count();
  
  console.log('\n📊 Database Summary:');
  console.log(`   - Customers: ${customerCount}`);
  console.log(`   - Cards: ${cardCount}`);
  console.log(`   - Transactions: ${transactionCount}`);
  console.log(`   - Alerts: ${alertCount2}`);
  console.log(`   - Devices: ${devices.length}`);
  console.log(`   - KB Documents: ${kbDocs.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });