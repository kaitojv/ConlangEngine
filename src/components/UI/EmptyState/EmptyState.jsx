import React from 'react';
import './emptyState.css';

export default function EmptyState({ icon: Icon, title, description, actionButton, secondaryButton, children }) {
    return (
        <div className="empty-state-wrapper">
            <div className="empty-state-icon-container">
                {Icon && <Icon size={48} strokeWidth={1.5} />}
            </div>
            <h3 className="empty-state-title">{title}</h3>
            <p className="empty-state-desc">{description}</p>
            {children && <div className="empty-state-content">{children}</div>}
            {(actionButton || secondaryButton) && (
                <div className="empty-state-actions">
                    {secondaryButton}
                    {actionButton}
                </div>
            )}
        </div>
    );
}
