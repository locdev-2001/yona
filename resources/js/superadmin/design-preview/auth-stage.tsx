import type { ReactNode } from 'react';
import { themeStyle, type PreviewTheme } from './tokens';
import './auth-screens.css';

function CircuitBackdrop() {
    return <svg className="auth-circuit" viewBox="0 0 1200 760" preserveAspectRatio="none" aria-hidden="true">
        <g className="auth-circuit-paths" fill="none"><path d="M136 130H330L380 180V250L460 330M1064 130H870L820 180V250L740 330M136 630H330L380 580V510L460 430M1064 630H870L820 580V510L740 430" /></g>
        {[{x:40,y:110},{x:1076,y:110},{x:40,y:610},{x:1076,y:610}].map(({x,y})=><g key={`${x}-${y}`}>
            <path className="auth-circuit-pins" d={`M${x-40} ${y+10}h40m-40 10h40m-40 10h40m84-20h40m-40 10h40m-40 10h40`} />
            <rect className="auth-circuit-node" x={x} y={y} width="84" height="40" />
            {Array.from({length:24},(_,index)=><circle className="auth-circuit-dot" key={index} cx={x+14+(index%8)*8} cy={y+12+Math.floor(index/8)*8} r="0.8" />)}
        </g>)}
    </svg>;
}

export function AuthStage({ children, theme, fullScreen = false }: { children: ReactNode; theme?: PreviewTheme; fullScreen?: boolean }) {
    return <div className={`console-auth-stage ${fullScreen ? 'console-auth-stage--screen' : ''}`} data-theme={theme} style={theme ? themeStyle(theme) : undefined}><CircuitBackdrop />{children}</div>;
}

export function AuthBrand({ logo, label, href }: { logo: string; label: string; href?: string }) {
    const mark = <img src={logo} alt={label} />;
    return <div className="auth-brand-mark"><span aria-hidden="true" />{href ? <a href={href}>{mark}</a> : mark}<span aria-hidden="true" /></div>;
}
