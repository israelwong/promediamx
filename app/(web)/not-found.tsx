import '@/app/globals.css'
import Link from 'next/link'
import Footer from './_components/Footer'

function NotFound() {
  return (
    <>
      <div className='h-1/2 text-white'>

        <div className='max-h-screen flex items-center justify-center text-white'>
          <div className='mx-auto py-28 text-center justify-center'>
            <div className='mb-8 md:pt-28 pt-18'>
              <h1 className='text-8xl font-Bebas-Neue'>404</h1>
              <p>Página no encontrada</p>
            </div>
            <Link
              href='/'
              className='px-4 py-3 bg-zinc-800 rounded-md'>
              Página principal
            </Link>
          </div>
        </div>

        <div className='md:fixed bottom-0 w-full'>

          <Footer />
        </div>
      </div>
    </>
  )
}

export default NotFound