
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 210 14% 15%;
    --foreground: 0 0% 98%;
    --card: 210 14% 18%;
    --card-foreground: 0 0% 98%;
    --popover: 210 14% 15%;
    --popover-foreground: 0 0% 98%;
    --primary: 210 74% 50%;
    --primary-foreground: 0 0% 100%;
    --secondary: 210 10% 25%;
    --secondary-foreground: 0 0% 98%;
    --muted: 210 10% 25%;
    --muted-foreground: 210 10% 70%;
    --accent: 300 60% 70%;
    --accent-foreground: 210 14% 15%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 210 10% 25%;
    --input: 210 10% 25%;
    --ring: 210 74% 50%;
    --radius: 0.75rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-body;
  }
}

.font-headline {
  font-family: 'Inter', sans-serif;
}

/* Custom scrollbar for dark theme */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: hsl(var(--background));
}
::-webkit-scrollbar-thumb {
  background: hsl(var(--secondary));
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--primary));
}
