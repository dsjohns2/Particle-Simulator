//@author Dan Johnson

//-------------------------------------------------------------------------
function planeFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray)
{
    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
           vertexArray.push(minX+deltaX*j);
           vertexArray.push(maxY-deltaY*i);
           vertexArray.push(0);
       }

    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+(n+1));
           faceArray.push(vid+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+(n+1));
           faceArray.push((vid+1) +(n+1));
       }
    //console.log(vertexArray);
    //console.log(faceArray);
}

//-------------------------------------------------------------------------

function pushVertex(v, vArray)
{
 for(i=0;i<3;i++)
 {
     vArray.push(v[i]);
 }  
}

//-------------------------------------------------------------------------
function divideTriangle(a,b,c,numSubDivs, vertexArray,fa)
{
    if (numSubDivs>0)
    {
        var numT=0;
        var ab =  vec4.create();
        vec4.lerp(ab,a,b,0.5+Math.random()*.3);
        var ac =  vec4.create();
        vec4.lerp(ac,a,c,0.5+Math.random()*.3);
        var bc =  vec4.create();
        vec4.lerp(bc,b,c,0.5+Math.random()*.3);
        
        numT+=divideTriangle(a,ab,ac,numSubDivs-1, vertexArray,fa);
        numT+=divideTriangle(ab,b,bc,numSubDivs-1, vertexArray,fa);
        numT+=divideTriangle(bc,c,ac,numSubDivs-1, vertexArray,fa);
        numT+=divideTriangle(ab,bc,ac,numSubDivs-1, vertexArray,fa);
        return numT;
    }
    else
    {
        // Add 3 vertices to the array
        
        pushVertex(a,vertexArray);
        fa.push(vertexArray.length-3);
        pushVertex(b,vertexArray);
        fa.push(vertexArray.length-6);
        pushVertex(c,vertexArray);
        fa.push(vertexArray.length-9);
        return 1;
        
    }   
}

//-------------------------------------------------------------------------
function planeFromSubdivision(n, minX,maxX,minY,maxY, vertexArray,faceArray,normalArray)
{
    var numT=0;
    var va = vec4.fromValues(minX,minY,0,0);
    var vb = vec4.fromValues(maxX,minY,Math.random(),0);
    var vc = vec4.fromValues(maxX,maxY,Math.random(),0);
    var vd = vec4.fromValues(minX,maxY,1.0,0);
    
    numT+=divideTriangle(va,vb,vd,n, vertexArray,faceArray);
    numT+=divideTriangle(vb,vc,vd,n, vertexArray,faceArray);
    
    for(var i=0; i<vertexArray.length; i=i+3)
    {
         normalArray.push(0);
         normalArray.push(0);
         normalArray.push(1);
    }
    
    return numT;
    
}

//-----------------------------------------------------------
function sphDivideTriangle(a,b,c,numSubDivs, vertexArray,normalArray)
{
    if (numSubDivs>0)
    {
        var numT=0;
        
        var ab =  vec4.create();
        vec4.lerp(ab,a,b,0.5);
        vec4.normalize(ab,ab);
        
        var ac =  vec4.create();
        vec4.lerp(ac,a,c,0.5);
        vec4.normalize(ac,ac);
        
        var bc =  vec4.create();
        vec4.lerp(bc,b,c,0.5);
        vec4.normalize(bc,bc);
        
        numT+=sphDivideTriangle(a,ab,ac,numSubDivs-1, vertexArray, normalArray);
        numT+=sphDivideTriangle(ab,b,bc,numSubDivs-1, vertexArray, normalArray);
        numT+=sphDivideTriangle(bc,c,ac,numSubDivs-1, vertexArray, normalArray);
        numT+=sphDivideTriangle(ab,bc,ac,numSubDivs-1, vertexArray, normalArray);
        return numT;
    }
    else
    {
        // Add 3 vertices to the array
        
        pushVertex(a,vertexArray);
        pushVertex(b,vertexArray);
        pushVertex(c,vertexArray);
        
        //normals are the same as the vertices for a sphere
        
        pushVertex(a,normalArray);
        pushVertex(b,normalArray);
        pushVertex(c,normalArray);
        
        return 1;
        
    }   
}

//-------------------------------------------------------------------------
function sphereFromSubdivision(numSubDivs, vertexArray, normalArray)
{
    var numT=0;
    var a = vec4.fromValues(0.0,0.0,-1.0,0);
    var b = vec4.fromValues(0.0,0.942809,0.333333,0);
    var c = vec4.fromValues(-0.816497,-0.471405,0.333333,0);
    var d = vec4.fromValues(0.816497,-0.471405,0.333333,0);
    
    numT+=sphDivideTriangle(a,b,c,numSubDivs, vertexArray, normalArray);
    numT+=sphDivideTriangle(d,c,b,numSubDivs, vertexArray, normalArray);
    numT+=sphDivideTriangle(a,d,b,numSubDivs, vertexArray, normalArray);
    numT+=sphDivideTriangle(a,c,d,numSubDivs, vertexArray, normalArray);
    return numT;
}


    
    
