/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                // Custom palette extensions if needed, consistent with "Minimalist"
                slate: {
                    950: '#020617', // Ensure dark mode deep color
                }
            }
        },
    },
    plugins: [],
}
