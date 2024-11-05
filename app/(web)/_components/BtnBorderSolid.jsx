function BtnBorderSolid({id,title,message, colorborder}) {

    const className = `bg-zinc-900 border ${colorborder} rounded-full py-2 px-4 text-sm`

    function whatsapp(){
        let url = "https://api.whatsapp.com/send?phone=+525544546582&text="+message;
        window.open(url, '_blank');
    }

    return (
            <button id={id} className={className} onClick={whatsapp} aria-hidden="true">
                {title} &nbsp;<i aria-hidden className="fab fa-whatsapp"></i>
            </button> 
    )
}

export default BtnBorderSolid
