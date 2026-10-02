const changes=require('./changes.json');module.exports=html=>{for(const [before,after]of [...changes].reverse())if(html.includes(after))html=html.replace(after,before);return html;};
