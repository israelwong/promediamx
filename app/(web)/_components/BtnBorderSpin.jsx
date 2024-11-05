
function BtnBorderSpin({id, title,message}) {

    function whatsapp(){
        let url = "https://api.whatsapp.com/send?phone=+525544546582&text="+message;
        window.open(url, '_blank');
    }
    return (
    <div>

        <div className="flex w-full max-w-lg">
            <div className="relative z-10 flex cursor-pointer overflow-hidden rounded-full border border-none p-[1.5px] md:mx-0 mx-auto">
            <div className="animate-rotate absolute h-full w-full rounded-full bg-[conic-gradient(#0ea5e9_20deg,transparent_120deg)]"></div>
                <button 
                id={id}
                onClick={whatsapp}
                className="relative z-20 flex w-full rounded-full bg-slate-950">          
                <span className="
                    relative z-50 block rounded-full border border-slate-800 bg-none px-6 py-3 
                    text-center text-sm text-white shadow-2xl transition duration-200 hover:bg-slate-800
                ">
                {title}
                </span>
                </button>
            </div>
        </div>
    </div>
    )
}

export default BtnBorderSpin
