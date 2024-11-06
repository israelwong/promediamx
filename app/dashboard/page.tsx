import Estadisticas from './_components/Estadisticas';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard'
}

export default async function DashboardPage() {
  return (
    <div className='p-5'>
      <Estadisticas />
    </div>
  );
}