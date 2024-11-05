"use client";

function BtnWaServicios({ id, title, message }) {
  function openWhatsapp() {
    window.open(`https://wa.me/+525544546582?text=${message}`, "_blank");
  }

  return (
    <button aria-hidden onClick={openWhatsapp} id={id}>
      <div
        className="group relative mx-auto flex max-w-fit flex-row items-center justify-center 
                rounded-full bg-white/40 px-4 py-1.5 
                text-lg font-medium 
                shadow-[inset_0_-8px_10px_#8fdfff1f] backdrop-blur-sm transition-shadow duration-500 ease-out [--bg-size:300%] hover:shadow-[inset_0_-5px_10px_#8fdfff3f] dark:bg-black/40"
      >
        <div className="absolute inset-0 block h-full w-full animate-gradient bg-gradient-to-r from-cyan-800/50 via-cyan-500/50 to-cyan/50 bg-[length:var(--bg-size)_100%] p-[1px] ![mask-composite:subtract] [border-radius:inherit] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]"></div>
        <div className="absolute inset-0 block size-full animate-gradient bg-gradient-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-[length:var(--bg-size)_100%] [border-radius:inherit] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] p-px ![mask-composite:subtract]"></div>
        <div
          data-orientation="vertical"
          role="none"
          className="shrink-0 bg-border w-px mx-2 h-4"
        ></div>
        <span className="animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent inline">
          {title}&nbsp; <i aria-hidden className="fab fa-whatsapp"></i>
        </span>
      </div>
    </button>
  );
}

export default BtnWaServicios;
