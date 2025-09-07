import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAlerts() {
  try {
    console.log('🧹 Clearing all alerts...');
    
    // Delete all alerts
    const deleteResult = await prisma.alert.deleteMany({});
    
    console.log(`✅ Successfully deleted ${deleteResult.count} alerts`);
    
    // Also clear agent traces if needed
    const deleteTraces = await prisma.agentTrace.deleteMany({});
    console.log(`✅ Successfully deleted ${deleteTraces.count} agent traces`);
    
  } catch (error) {
    console.error('❌ Error clearing alerts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAlerts();