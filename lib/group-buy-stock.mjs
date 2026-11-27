/** Pure stock projection. Not a reservation API; DB locking is required. */
export function projectStock(capacity, orders) {
 if (![50,100].includes(capacity) || !Array.isArray(orders)) throw new RangeError('Invalid capacity or orders');
 const ids=new Set();
 let occupied=0;
 for(const {id,quantity,status} of orders){
  if(typeof id!=='string'||!id.trim()||ids.has(id)) throw new Error('Invalid or duplicate order');
  ids.add(id);
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>capacity) throw new RangeError('Invalid quantity');
  if(!['reserved','paid','shipped','delivered','cancelled','expired'].includes(status)) throw new Error('Unknown status');
  if(!['cancelled','expired'].includes(status)) occupied+=quantity;
  if(occupied>capacity) throw new RangeError('Oversold');
 }
 return Object.freeze({capacity,occupied,available:capacity-occupied});
}
