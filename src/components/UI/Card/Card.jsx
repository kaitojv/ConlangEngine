import './card.css'
import { motion } from 'framer-motion';

export default function Card({ children, className = '', ...props }) {
    return (
        <motion.div className={`${className}`.trim() + ' card' } {...props}>
            {children}
        </motion.div>
    )
}
