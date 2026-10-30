const {Resvg} = require('@resvg/resvg-js'); const fs = require('fs');
const [X, OUT] = process.argv.slice(2);
const si = n => fs.readFileSync(`${X}/simple-icons-13.21.0/package/icons/${n}.svg`, 'utf8').match(/<path d="([^"]+)"/)[1];
const lu = n => fs.readFileSync(`${X}/lucide-static-0.460.0/package/icons/${n}.svg`, 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '');
const save = (name, svg, size) => fs.writeFileSync(`${OUT}/${name}.png`, new Resvg(svg, {fitTo: {mode: 'width', value: size}}).render().asPng());
// brand app icons
save('whatsapp', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
 <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5FFC7B"/><stop offset="1" stop-color="#28D146"/></linearGradient></defs>
 <rect width="100" height="100" rx="23" fill="url(#g)"/>
 <g transform="translate(20 20) scale(2.5)" fill="#fff"><path d="${si('whatsapp')}"/></g></svg>`, 512);
save('instagram', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
 <defs><radialGradient id="g" cx="0.3" cy="1.07" r="1.5"><stop offset="0" stop-color="#fdf497"/><stop offset="0.05" stop-color="#fdf497"/>
 <stop offset="0.45" stop-color="#fd5949"/><stop offset="0.6" stop-color="#d6249f"/><stop offset="0.9" stop-color="#285AEB"/></radialGradient></defs>
 <rect width="100" height="100" rx="23" fill="url(#g)"/>
 <g transform="translate(21 21) scale(2.4167)" fill="#fff"><path d="${si('instagram')}"/></g></svg>`, 512);
// line-icon badges
const badge = (name, icon, bg, fg, ring) => save(name, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
 <circle cx="50" cy="50" r="48" fill="${bg}"/>${ring ? `<circle cx="50" cy="50" r="45.5" fill="none" stroke="${ring}" stroke-width="3"/>` : ''}
 <g transform="translate(24 24) scale(2.1667)" fill="none" stroke="${fg}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${lu(icon)}</g></svg>`, 512);
const Y = '#1D4ED8', K = '#0B1A4A', W = '#FFFFFF', R = '#E11D48', G = '#22C55E', O = '#FF9900';
badge('building', 'building-2', Y, W); badge('users', 'users', W, K); badge('briefcase', 'briefcase', Y, W);
badge('chat', 'message-circle', W, K); badge('grad', 'graduation-cap', Y, W); badge('calendar', 'calendar-check', O, W);
badge('pin', 'map-pin', Y, W); badge('rocket', 'rocket', K, '#60A5FA', '#60A5FA'); badge('check', 'check', G, W);
badge('sparkles', 'sparkles', K, '#60A5FA', '#60A5FA'); badge('eye', 'eye', W, K); badge('handshake', 'handshake', Y, W);
badge('question', 'message-circle-question', W, K); badge('star', 'star', O, W); badge('x', 'x', R, W);
console.log('done');
