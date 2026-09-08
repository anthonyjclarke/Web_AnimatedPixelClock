import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Pixel Clock — The Arcade Collection',description:'An animated 128 × 64 pixel clock with thirteen arcade styles, timezones, and fullscreen display.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
