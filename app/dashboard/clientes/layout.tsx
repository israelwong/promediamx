import React from 'react'

function layout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className='p-5'>
            {children}
        </div>
    )
}

export default layout
