import React, { useState } from 'react'

interface SearchInputProps {
    onSearchTermChange: (searchTerm: string) => void
}

const SearchInput: React.FC<SearchInputProps> = ({ onSearchTermChange }) => {
    const [searchTerm, setSearchTerm] = useState('')

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = event.target.value
        setSearchTerm(newSearchTerm)
        onSearchTermChange(newSearchTerm)
    }

    return (
        <input
            type='text'
            placeholder='Buscar...'
            className='border rounded-md px-3 py-2 text-sm mr-5 leading-3 text-black'
            value={searchTerm}
            onChange={handleInputChange}
        />
    )
}

export default SearchInput