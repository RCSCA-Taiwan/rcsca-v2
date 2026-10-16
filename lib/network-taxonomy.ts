import taxonomy from './network-taxonomy.json';
export const networkTaxonomy=taxonomy;
export const networkCategories=taxonomy.flatMap(group=>group.children.map(item=>({...item,group:group.code,groupLabel:group.label})));
const byCode=new Map(networkCategories.map(item=>[item.code,item]));
const aliases:Record<string,string>={'室內設計':'design.interiors','餐飲':'food.restaurant','法律':'legal.law','旅宿':'travel.hotel','交通運輸':'transport.passenger','寵物服務':'pets.boarding','醫療照護':'health.nursing','教育':'education.tutoring','水電工程':'construction.electrical','保險':'legal.insurance','會計':'legal.accounting','汽車':'automotive.maintenance','活動公關':'events.planning'};
export function networkCategoryCode(value:string){return byCode.has(value)?value:aliases[value]||networkCategories.find(item=>item.label===value)?.code||value;}
export function networkCategory(value:string){return byCode.get(networkCategoryCode(value));}
export function networkCategoryLabel(value:string){return networkCategory(value)?.label||value;}
export function networkCategoryPath(value:string){const item=networkCategory(value);return item?`${item.groupLabel}／${item.label}`:value;}
