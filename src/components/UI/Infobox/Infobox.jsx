import React from 'react';
import { Info } from 'lucide-react';
import './infobox.css';

export default function Infobox({ title = "View Guide", children }) {
    return (
        <details className="details-tab">
            <summary className="summary-tab">
                <Info size={18} /> {title}
            </summary>
            <div className="info-tab">
                {children}
            </div>
        </details>
    );
}
