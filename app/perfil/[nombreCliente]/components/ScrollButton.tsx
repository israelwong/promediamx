import React, { useState, useEffect } from "react";

const ScrollButton: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollPercentage =
                (window.scrollY /
                    (document.documentElement.scrollHeight -
                        document.documentElement.clientHeight)) *
                100;
            setIsVisible(scrollPercentage > 20);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <button
            onClick={scrollToTop}
            className={`    
                fixed bottom-8 left-1/2 -translate-x-1/2
                bg-red-800/90 text-white border border-red-500
                text-sm font-FunnelSans-Light
                px-5 py-2 
                rounded-full shadow-md transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"
                }`}
            style={{ display: isVisible ? "block" : "none" }}
        >
            Ir arriba
        </button>
    );
};

export default ScrollButton;