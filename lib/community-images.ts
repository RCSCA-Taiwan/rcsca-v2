export type PreparedImage={blob:Blob;url:string;path?:string;id?:string};
/** Re-encode only rendered pixels; original EXIF/GPS metadata is not uploaded. */
export async function prepareCommunityImage(file:File):Promise<PreparedImage>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024||!file.size)throw Error('每張圖片須為 JPG、PNG 或 WebP，且不超過 5 MB。');
 const bitmap=await createImageBitmap(file);
 try{if(bitmap.width*bitmap.height>40000000)throw Error('圖片尺寸過大，請先縮小再上傳。');const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('此瀏覽器無法處理圖片。');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('圖片處理失敗。')),'image/jpeg',.8));if(blob.size>2*1024*1024)throw Error('壓縮後圖片仍過大，請選擇較小的圖片。');return{blob,url:URL.createObjectURL(blob)};}finally{bitmap.close();}
}
