/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html', 
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      // Keyframes for the notification popup animation
      keyframes: {
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        }
      },
      // Animation utility for the notification
      animation: {
        'fade-in-down': 'fade-in-down 0.5s ease-out'
      }
    },
  },
  // This plugins array is essential for extra features
  plugins: [
    // This plugin is required for the `prose` class to style the itinerary
    require('@tailwindcss/typography'),
  ],
};

