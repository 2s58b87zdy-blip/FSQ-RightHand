import { getBlobContainerClient } from '../../../lib/blob';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function safe(value){return String(value||'General').trim().replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'General'}
function container() { return getBlobContainerClient(); }
export async function POST(request){
  try{
    const form=await request.formData();const file=form.get('file');
    if(!file||typeof file==='string')return Response.json({error:'No file received'},{status:400});
    if(file.size>100*1024*1024)return Response.json({error:'Maximum file size is 100 MB'},{status:413});
    const folder=safe(form.get('folder')),machine=safe(form.get('machine')),uploadedBy=safe(form.get('uploadedBy')),name=safe(file.name);
    const blobName=`knowledge/${folder}/${machine}/${Date.now()}-${name}`;const c=container();await c.createIfNotExists({access:'private'});const block=c.getBlockBlobClient(blobName);const buffer=Buffer.from(await file.arrayBuffer());
    await block.uploadData(buffer,{blobHTTPHeaders:{blobContentType:file.type||'application/octet-stream'},metadata:{folder,machine,uploadedby:uploadedBy,originalname:name}});
    return Response.json({document:{name:file.name,blobName,url:`/api/knowledge/file?blob=${encodeURIComponent(blobName)}`,size:file.size<1024*1024?`${Math.ceil(file.size/1024)} KB`:`${(file.size/1024/1024).toFixed(1)} MB`,mimeType:file.type,date:new Date().toISOString(),uploadedBy,storage:'Azure Blob Storage'}});
  }catch(error){return Response.json({error:error.message||'Upload failed'},{status:500})}
}
export async function DELETE(request){try{const blob=new URL(request.url).searchParams.get('blob');if(!blob)return Response.json({error:'Blob name required'},{status:400});await container().deleteBlob(blob,{deleteSnapshots:'include'});return Response.json({ok:true})}catch(error){return Response.json({error:error.message||'Delete failed'},{status:500})}}
