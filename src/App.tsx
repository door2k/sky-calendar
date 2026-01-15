import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { startOfWeek, format } from 'date-fns';
import { WeekView } from './pages/WeekView';
import { MonthView } from './pages/MonthView';
import { PrintWeek } from './pages/PrintWeek';
import { PrintMonth } from './pages/PrintMonth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const currentWeekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 0 }),
    'yyyy-MM-dd'
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={`/week/${currentWeekStart}`} replace />} />
          <Route path="/week" element={<Navigate to={`/week/${currentWeekStart}`} replace />} />
          <Route path="/week/:date" element={<WeekView />} />
          <Route path="/month" element={<Navigate to={`/month/${format(new Date(), 'yyyy-MM')}`} replace />} />
          <Route path="/month/:month" element={<MonthView />} />
          <Route path="/print/week/:date" element={<PrintWeek />} />
          <Route path="/print/month/:month" element={<PrintMonth />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
