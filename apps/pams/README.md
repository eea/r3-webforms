# GovReg Annex I WebForms

A React + TypeScript + Vite application for consuming and displaying API data.

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Working with APIs in Vite

### Environment Variables

Vite has built-in support for environment variables. Create `.env` files in the root directory:

- `.env` - Loaded in all cases
- `.env.local` - Loaded in all cases, ignored by git
- `.env.development` - Only loaded in development
- `.env.production` - Only loaded in production

**Important:** Only variables prefixed with `VITE_` are exposed to your client-side code.

```env
# .env.local
VITE_API_URL=https://api.example.com
VITE_API_KEY=your-api-key
```

Access them in your code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL
const apiKey = import.meta.env.VITE_API_KEY
```

### Proxy Configuration

To avoid CORS issues during development, configure a proxy in `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

Now you can make requests to `/api/endpoint` and they'll be proxied to `https://api.example.com/endpoint`

### Tips for API Integration

1. **Use Fetch or Axios**: Both work well with Vite. Install axios if needed: `npm install axios`

2. **Create an API service layer**: Centralize your API calls in a service file (e.g., `src/services/api.ts`)

3. **Handle loading and error states**: Always manage loading, success, and error states in your components

4. **Use React hooks for data fetching**: Consider using `useEffect` for simple cases, or libraries like `react-query` or `swr` for advanced data fetching

5. **Type your API responses**: Leverage TypeScript to create interfaces for your API data

Example API service:

```typescript
// src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL

export const fetchData = async (endpoint: string) => {
  const response = await fetch(`${API_URL}${endpoint}`)
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  return response.json()
}
```

## Material-UI (MUI)

This project uses Material-UI for the component library. MUI provides a comprehensive set of pre-built React components.

### Installed Packages

- `@mui/material` - Core MUI components
- `@mui/icons-material` - Material Design icons
- `@emotion/react` - Required peer dependency for styling
- `@emotion/styled` - Required peer dependency for styling

### Resources

- [MUI Documentation](https://mui.com/material-ui/getting-started/)
- [Component API](https://mui.com/material-ui/api/button/)
- [MUI Icons](https://mui.com/material-ui/material-icons/)

### Example Components

The home page includes examples of various MUI components:
- Buttons (contained, outlined, text, with icons)
- Text Fields (standard, filled, outlined, multiline)
- Selects and Dropdowns
- Checkboxes and Switches
- Sliders
- Alerts
- Chips
- Cards with content and actions

## Highcharts

This project uses Highcharts for data visualization. Highcharts is a powerful JavaScript charting library.

### Installed Packages

- `highcharts` - Core Highcharts library
- `highcharts-react-official` - Official React wrapper for Highcharts

### Resources

- [Highcharts Documentation](https://www.highcharts.com/docs/index)
- [Highcharts API Reference](https://api.highcharts.com/highcharts/)
- [Highcharts Demos](https://www.highcharts.com/demo)
- [React Wrapper Documentation](https://github.com/highcharts/highcharts-react)

### Example Usage

The home page includes a Highcharts example with:
- Line charts for Sales and Revenue
- Column chart for Profit
- Interactive tooltips and legends
- Responsive design

Example code:

```typescript
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'

const chartOptions: Highcharts.Options = {
  title: { text: 'My Chart' },
  series: [{
    type: 'line',
    data: [1, 2, 3, 4, 5]
  }]
}

<HighchartsReact
  highcharts={Highcharts}
  options={chartOptions}
/>
```

### Chart Types Available

Highcharts supports numerous chart types including:
- Line, Spline, Area
- Column, Bar
- Pie, Donut
- Scatter, Bubble
- Heatmap, Treemap
- And many more...

## Vite Features

This template uses Vite with React and provides:

- Fast Hot Module Replacement (HMR)
- TypeScript support
- ESLint configuration
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
