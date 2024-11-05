
function BtnSeccion({id, title, href, bordercolor}) {

    const className = `border ${bordercolor} rounded-full px-4 py-2 text-white text-sm font-semibold hover:bg-gray-800 hover:text-${bordercolor} hover:border-${bordercolor} transition duration-300 ease-in-out`

    return (
        <div>

            <a aria-hidden id={id} href={href} className={className} target='_self'>
                {title} &nbsp;<i aria-hidden className="fas fa-long-arrow-alt-right"></i>
            </a> 
            
        </div>
    )
}

export default BtnSeccion
