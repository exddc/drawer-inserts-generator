import React from 'react';

interface HeaderProps {
    title?: string;
}

export default function Header({ title = 'Box Grid Generator' }: HeaderProps) {
    return (
        <header className="border-b p-4">
            <h1 className="text-xl font-bold">{title}</h1>
        </header>
    );
}
