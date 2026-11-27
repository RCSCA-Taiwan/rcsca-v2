/** Pure transition guard; caller must authenticate actors and lock DB rows. */
export function nextOrderStatus(status,event){
 const transitions={reserved:{bank_verified:'paid',cancel:'cancelled',expire:'expired'},paid:{dispatch:'shipped'},shipped:{confirm_delivery:'delivered'}};
 if(!Object.hasOwn(transitions,status)||!Object.hasOwn(transitions[status],event)) throw new Error('Forbidden order transition');
 return transitions[status][event];
}
