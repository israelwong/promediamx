"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

export default function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date())

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    }

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentDate)
        const firstDayOfMonth = getFirstDayOfMonth(currentDate)
        const days = []

        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>)
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const isToday =
                i === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear()
            days.push(
                <div
                    key={i}
                    className={`h-8 w-8 flex items-center justify-center rounded-full cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors
                    ${isToday ? "bg-primary text-primary-foreground" : ""}`}
                >
                    {i}
                </div>,
            )
        }

        return days
    }

    return (
        <div className="w-full max-w-sm mx-auto bg-background shadow-lg rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-primary text-primary-foreground">
                <button onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <h2 className="text-lg font-semibold">
                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {DAYS.map((day) => (
                        <div key={day} className="text-center text-sm font-medium text-muted-foreground">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2">{renderCalendarDays()}</div>
            </div>
        </div>
    )
}

