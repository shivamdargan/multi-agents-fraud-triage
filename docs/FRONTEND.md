# Frontend Documentation - Next.js Application

## 🏗️ Frontend Architecture

```mermaid
graph TB
    subgraph "Next.js Application"
        subgraph "Pages & Routing"
            AppRouter[App Router]
            Pages[Page Components]
            Layouts[Layouts]
        end
        
        subgraph "Components Layer"
            UI[UI Components]
            Features[Feature Components]
            Shared[Shared Components]
        end
        
        subgraph "State Management"
            ReactQuery[React Query]
            LocalState[React State]
            Context[Context API]
        end
        
        subgraph "API Layer"
            APIClient[API Client]
            Hooks[Custom Hooks]
            Services[API Services]
        end
    end
    
    Browser[Browser] --> AppRouter
    AppRouter --> Pages
    Pages --> Layouts
    Pages --> Features
    Features --> UI
    Features --> Hooks
    Hooks --> ReactQuery
    Hooks --> APIClient
    APIClient --> Backend[Backend API]
```

## 📁 Project Structure

```
apps/frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── dashboard/         # Dashboard routes
│   ├── customers/         # Customer routes
│   ├── transactions/      # Transaction routes
│   └── settings/          # Settings routes
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   ├── charts/           # Data visualization
│   ├── navigation.tsx    # Main navigation
│   └── *.tsx            # Feature components
├── lib/                  # Utilities and configs
│   ├── api/             # API client and services
│   ├── hooks/           # Custom React hooks
│   ├── utils.ts         # Utility functions
│   └── store.ts         # State management
├── styles/              # Global styles
└── public/              # Static assets
```

## 🎨 Component Architecture

```mermaid
graph TB
    subgraph "Component Hierarchy"
        RootLayout[Root Layout]
        Navigation[Navigation]
        PageLayout[Page Layout]
        
        subgraph "Feature Components"
            FraudQueue[Fraud Queue]
            CustomerDetails[Customer Details]
            TransactionList[Transaction List]
            InsightsReports[Insights Reports]
            TriageDrawer[Triage Drawer]
        end
        
        subgraph "UI Components"
            Card[Card]
            Button[Button]
            Dialog[Dialog]
            Table[Table]
            Badge[Badge]
        end
    end
    
    RootLayout --> Navigation
    RootLayout --> PageLayout
    PageLayout --> FraudQueue
    PageLayout --> CustomerDetails
    FraudQueue --> Table
    FraudQueue --> Badge
    CustomerDetails --> Card
    CustomerDetails --> InsightsReports
    TransactionList --> Table
    TriageDrawer --> Dialog
```

## 🔄 Data Flow & State Management

```mermaid
sequenceDiagram
    participant Component
    participant Hook
    participant ReactQuery
    participant APIClient
    participant Backend
    participant Cache
    
    Component->>Hook: useFraudQueue()
    Hook->>ReactQuery: useQuery()
    ReactQuery->>Cache: Check cache
    alt Cache miss
        ReactQuery->>APIClient: Fetch data
        APIClient->>Backend: HTTP request
        Backend-->>APIClient: Response
        APIClient-->>ReactQuery: Data
        ReactQuery->>Cache: Store
    end
    ReactQuery-->>Hook: Data/Loading/Error
    Hook-->>Component: Render state
```

## 🎯 Key Components

### 1. Fraud Queue Component
```tsx
// components/fraud-queue.tsx
export function FraudQueue() {
  const { data: alerts, isLoading } = useFraudQueue();
  
  return (
    <DataTable
      columns={columns}
      data={alerts}
      onRowClick={handleTriageOpen}
    />
  );
}
```

### 2. Triage Drawer
```tsx
// components/triage-drawer.tsx
export function TriageDrawer({ alert, onClose }) {
  const triageMutation = useRunTriage();
  
  return (
    <Sheet open={!!alert} onOpenChange={onClose}>
      <SheetContent>
        {/* Risk analysis dashboard */}
        {/* AI recommendations */}
        {/* Action buttons */}
      </SheetContent>
    </Sheet>
  );
}
```

### 3. Customer Insights
```tsx
// components/insights-reports.tsx
export function InsightsReports({ customerId }) {
  const { data: insights } = useCustomerInsights(customerId);
  const generateReport = useGenerateReport();
  
  return (
    <Card>
      <SpendChart data={insights.spending} />
      <CategoryBreakdown data={insights.categories} />
      <ReportGenerator onGenerate={generateReport} />
    </Card>
  );
}
```

## 🪝 Custom Hooks

### API Hooks
```typescript
// lib/hooks/useFraud.ts
export function useFraudQueue(status?: string) {
  return useQuery({
    queryKey: ['fraud-queue', status],
    queryFn: () => fraudApi.getFraudQueue(status),
    refetchInterval: 5000, // Live polling
  });
}

export function useRunTriage() {
  return useMutation({
    mutationFn: fraudApi.runTriage,
    onSuccess: () => {
      queryClient.invalidateQueries(['fraud-queue']);
    },
  });
}
```

### State Hooks
```typescript
// lib/hooks/useLocalStorage.ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  
  useEffect(() => {
    const item = window.localStorage.getItem(key);
    if (item) setStoredValue(JSON.parse(item));
  }, [key]);
  
  const setValue = (value: T) => {
    setStoredValue(value);
    window.localStorage.setItem(key, JSON.stringify(value));
  };
  
  return [storedValue, setValue] as const;
}
```

## 🎨 UI Component Library

### Shadcn/UI Components
- **Card**: Container component
- **Button**: Interactive buttons
- **Dialog**: Modal dialogs
- **Sheet**: Side drawer
- **Table**: Data tables
- **Badge**: Status indicators
- **Select**: Dropdown menus
- **Tabs**: Tab navigation

### Custom Components
- **DataTable**: Enhanced table with sorting/filtering
- **MetricCard**: KPI display
- **RiskIndicator**: Risk level visualization
- **TimelineChart**: Time-series visualization
- **ExportDialog**: Data export UI

## 🚀 Routing Structure

```
/                           # Home/Landing
/dashboard                  # Main dashboard
/customers                  # Customer list
/customers/[id]            # Customer details
/transactions              # Transaction list
/transactions/[id]         # Transaction details
/fraud                     # Fraud queue
/insights                  # Analytics
/knowledge-base           # KB articles
/evaluations              # Model evals
```

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Auth
    participant API
    participant Protected
    
    User->>App: Access protected route
    App->>Auth: Check auth status
    alt Not authenticated
        Auth-->>App: Redirect to login
        App-->>User: Show login page
        User->>Auth: Submit credentials
        Auth->>API: Validate
        API-->>Auth: Token
        Auth-->>App: Store token
    end
    Auth-->>App: Authenticated
    App->>Protected: Render page
    Protected-->>User: Show content
```

## 📊 Data Visualization

### Chart Components
```tsx
// Spend Trend Chart
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={spendData}>
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="amount" stroke="#8884d8" />
  </LineChart>
</ResponsiveContainer>

// Risk Distribution
<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%">
      {riskData.map((entry, index) => (
        <Cell key={index} fill={COLORS[index % COLORS.length]} />
      ))}
    </Pie>
    <Tooltip />
  </PieChart>
</ResponsiveContainer>
```

## 🎯 Performance Optimization

### Code Splitting
```tsx
// Dynamic imports for route-based splitting
const CustomerDetails = dynamic(() => import('./customer-details'), {
  loading: () => <LoadingSpinner />,
});
```

### Image Optimization
```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority
/>
```

### Memoization
```tsx
const MemoizedExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => 
    expensiveCalculation(data), [data]
  );
  
  return <Chart data={processedData} />;
});
```

## 🧪 Testing

### Component Testing
```tsx
// __tests__/FraudQueue.test.tsx
describe('FraudQueue', () => {
  it('renders fraud alerts', async () => {
    render(<FraudQueue />);
    await waitFor(() => {
      expect(screen.getByText('High Risk')).toBeInTheDocument();
    });
  });
});
```

### Hook Testing
```tsx
// __tests__/hooks/useFraud.test.ts
describe('useFraudQueue', () => {
  it('fetches fraud queue data', async () => {
    const { result } = renderHook(() => useFraudQueue());
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

## 🎨 Styling System

### TailwindCSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0070f3',
          secondary: '#ff4081',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### CSS Variables
```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
}
```

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm run test

# Analyze bundle
npm run analyze
```