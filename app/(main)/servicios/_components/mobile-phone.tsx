import type React from "react"

const MobilePhone: React.FC = () => {
    return (
        <div className="flex justify-center items-center p-4">
            <div className="relative w-[300px] h-[600px] bg-zinc-800 rounded-[3rem] shadow-xl overflow-hidden">
                {/* Phone frame */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-7 bg-zinc-900 rounded-b-3xl"></div>

                {/* Camera */}
                <div className="absolute top-2 right-1/3 w-3 h-3 bg-gray-800 rounded-full"></div>

                {/* Speaker */}
                <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gray-400 rounded-full"></div>

                {/* Screen */}
                <div className="absolute top-[10px] left-[10px] right-[10px] bottom-[10px] bg-white rounded-[2.5rem] overflow-hidden">
                    {/* Placeholder for image or video */}
                    <div className="w-full h-full flex justify-center items-center bg-black">
                        <p className="text-gray-500 text-center p-4">Add your image or video here</p>
                    </div>
                </div>

                {/* Home button */}
                {/* <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-12 border-2 border-gray-400 rounded-full"></div> */}
            </div>
        </div>
    )
}

export default MobilePhone

