import './card.css'

export default function Card({ children, className = '', ...props }) {
    return (
        <div className={`${className}`.trim() + ' card' } {...props}>
            {children}
        </div>
    )
}