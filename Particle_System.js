
var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

var UDAngle=0.0, eyeQuatUD = quat.create(), RLAngle = 0.0, eyeQuatLR=quat.create(), YAngle = 0.0, eyeQuatY=quat.create();
var axisToRot = vec3.create();
var speed = 0.00;

// Create a place to store sphere geometry
var sphereVertexPositionBuffer;

//Create a place to store normals for shading
var sphereVertexNormalBuffer;

// View parameters
var eyePt = vec3.fromValues(0.0,0.0,150.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

//Create Sphere matrices
var positionMatrix = [];
var scaleMatrix = [];
var velocityMatrix = [];
var materialMatrix = [];

var num_spheres = 0;
var gravity_toggle = false;
var drag_toggle = false;
var last_time_update = Date.now();
var cor = .95;

var mvMatrixStack = [];

/**
 * Sets up the buffers for the sphere mesh.
 */
//-------------------------------------------------------------------------
function setupSphereBuffers() {
    
    var sphereSoup=[];
    var sphereNormals=[];
    var numT=sphereFromSubdivision(6,sphereSoup,sphereNormals);
    console.log("Generated ", numT, " triangles"); 
    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = numT*3;
    console.log(sphereSoup.length/9);
    
    // Specify normals to be able to do lighting calculations
    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals),
                  gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = numT*3;
    
    console.log("Normals ", sphereNormals.length/3);     
}

/**
 * Draws a single sphere based off of the sphere matrices' elements.
 * @param cur_sphere: current sphere that is being drawn in the matrix
 * @return nothing
 */
//-------------------------------------------------------------------------
function drawSphere(cur_sphere){
 var transformVec = vec3.create();
 
 // Set up light parameters
 var Ia = vec3.fromValues(.5,.5,.5);
 var Id = vec3.fromValues(1.0,1.0,1.0);
 var Is = vec3.fromValues(1.0,1.0,1.0);
    
 // Set up materials
 var materialr = materialMatrix[cur_sphere*3+0];
 var materialg = materialMatrix[cur_sphere*3+1];
 var materialb = materialMatrix[cur_sphere*3+2];
 ka = vec3.fromValues(materialr,materialg,materialb);
 kd = vec3.fromValues(.4,0.4,0.4);
 ks = vec3.fromValues(.2*materialr,.2*materialg,.2*materialb);
    
 var lightPosEye4 = vec4.fromValues(0.0, 0.0,0.0,1.0);
 lightPosEye4 = vec4.transformMat4(lightPosEye4,lightPosEye4,mvMatrix);
 var lightPosEye = vec3.fromValues(lightPosEye4[0],lightPosEye4[1],lightPosEye4[2]);
    
 //Translate    
 var positionx = positionMatrix[cur_sphere*3+0];
 var positiony = positionMatrix[cur_sphere*3+1];
 var positionz = positionMatrix[cur_sphere*3+2];
 vec3.set(transformVec,positionx,positiony,positionz);
 mat4.translate(mvMatrix, mvMatrix,transformVec);
    
 //Scale
 var scalex = scaleMatrix[cur_sphere*3+0];
 var scaley = scaleMatrix[cur_sphere*3+1];
 var scalez = scaleMatrix[cur_sphere*3+2];
 vec3.set(transformVec,scalex,scaley,scalez);
 mat4.scale(mvMatrix, mvMatrix,transformVec);
    
 uploadLightsToShader(lightPosEye,Ia,Id,Is);
 uploadMaterialToShader(ka,kd,ks);
 setMatrixUniforms();    
    
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           sphereVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);
 gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);      
}

/**
 * Uploads the model view matrix to the shader.
 */
//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Uploads the projection matrix to the shader.
 */
//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

/**
 * Uploads the normal matrix to the shader.
 */
//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

/**
 * Pushes a mvmatrix to the stack.
 */
//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

/**
 * Pops a mvmatrix off the stack.
 */
//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
 * Sends the matrix uniforms to the shader.
 */
//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

/**
 * Converts degrees to radians.
 */
//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
    
  shaderProgram.uniformAmbientMatColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientMatColor");  
  shaderProgram.uniformDiffuseMatColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseMatColor");
  shaderProgram.uniformSpecularMatColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularMatColor");   
}


//-------------------------------------------------------------------------
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//-------------------------------------------------------------------------
function uploadMaterialToShader(a,d,s) {
  gl.uniform3fv(shaderProgram.uniformAmbientMatColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMatColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMatColorLoc, s);
}


//----------------------------------------------------------------------------------
function setupBuffers() {
    setupSphereBuffers();     
}

/**
 * Draws the spheres.
 */
//----------------------------------------------------------------------------------
function draw() { 
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);    
    
    //draw spheres
    for(var i=0; i<num_spheres; i++){
        mvPushMatrix();
        drawSphere(i);
        mvPopMatrix();
    }
}

/**
 * Updates the position and velocity of each sphere.
 */
//----------------------------------------------------------------------------------
function animate() {
    var timestep = Date.now() - last_time_update;
    console.log("Timestep: ", timestep); 
    
    //Update position
    var tuning = 20;
    for(var i=0; i<num_spheres*3; i++){
        if(positionMatrix[i] <= 50 && positionMatrix[i] >= -50){
            positionMatrix[i] += velocityMatrix[i]*timestep/tuning;
        }
        else if(positionMatrix[i] > 50){
            velocityMatrix[i] *= -1*cor;
            positionMatrix[i] = 50;
        }
        else{ //positionMatrix[i] < -50
            velocityMatrix[i] *= -1*cor;
            positionMatrix[i] = -50;
        }
    }
    
    //Update velocity
    var gravity_constant = -.01;
    if(gravity_toggle && drag_toggle){
        for(var i=0; i<num_spheres*3; i++){
            velocityMatrix[i] *= 1-1/100*timestep/tuning;
            if(i%3 == 1){
                velocityMatrix[i] += timestep*gravity_constant;
            }
        }
    }
    else if(gravity_toggle){
        for(var i=0; i<num_spheres*3; i++){
            if(i%3 == 1){
                velocityMatrix[i] += timestep*gravity_constant;
            }
        }       
    }
    else if(drag_toggle){
        for(var i=0; i<num_spheres*3; i++){
            velocityMatrix[i] *= 1-1/100*timestep/tuning;
        }
    }
    
    //Update last time used
    last_time_update = Date.now();
}

function setup_one_starting_sphere(){
        num_spheres++;
        
        positionMatrix.push(Math.random()*100-50);
        positionMatrix.push(Math.random()*100-50);
        positionMatrix.push(Math.random()*100-50);
        
        velocityMatrix.push(Math.random()*2-1);
        velocityMatrix.push(Math.random()*2-1);
        velocityMatrix.push(Math.random()*2-1);
        
        var new_scale = Math.random()*5;
        scaleMatrix.push(new_scale);
        scaleMatrix.push(new_scale);
        scaleMatrix.push(new_scale);
        
        materialMatrix.push(Math.random()*(1-.3)+.3);
        materialMatrix.push(Math.random()*(1-.3)+.3);
        materialMatrix.push(Math.random()*(1-.3)+.3);
}

//----------------------------------------------------------------------------------
function startup() {
  canvas = document.getElementById("myGLCanvas");
  window.addEventListener( 'keydown', onKeyDown, false );
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  setup_one_starting_sphere();
  tick();
}

//----------------------------------------------------------------------------------
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}

/**
 * Handles the events of when certain keys are pressed.
 * The actions that correspond to the keys are documented
 * on the flight html page.
 * @param event
 * @return nothing
 */
function onKeyDown(event)
{
    //go up
    if(event.keyCode =="38"){
        eyePt[1] += .5;
    }
    //go down
    if(event.keyCode =="40"){
        eyePt[1] -= .5;
    }
    //rotate left
    if(event.keyCode =="85"){
        //create the quat
        axisToRot = vec3.clone(up);
        quat.setAxisAngle(eyeQuatLR, axisToRot, degToRad(1.25/4))
        
        //apply the quat
        vec3.transformQuat(viewDir,viewDir,eyeQuatLR);
    }
    //rotate right
    if(event.keyCode =="73"){
        axisToRot = vec3.clone(up);
        quat.setAxisAngle(eyeQuatLR, axisToRot, degToRad(-1.25/4))
        vec3.transformQuat(viewDir,viewDir,eyeQuatLR);
    }
    //go right
    if(event.keyCode =="39"){
        eyePt[0] += .5;
    }
    //go left
    if(event.keyCode =="37"){
        eyePt[0] -= .5;
    }
    //go forward
    if(event.keyCode =="79"){
        eyePt[2] -= .5;
    }
    //go backward
    if(event.keyCode =="80"){
        eyePt[2] += .5;
    }
    //add a sphere
    if(event.keyCode =="65"){
        num_spheres++;
        
        positionMatrix.push(Math.random()*100-50);
        positionMatrix.push(Math.random()*100-50);
        positionMatrix.push(Math.random()*100-50);
        
        velocityMatrix.push(Math.random()*2-1);
        velocityMatrix.push(Math.random()*2-1);
        velocityMatrix.push(Math.random()*2-1);
        
        var new_scale = Math.random()*5;
        scaleMatrix.push(new_scale);
        scaleMatrix.push(new_scale);
        scaleMatrix.push(new_scale);
        
        materialMatrix.push(Math.random()*(1-.3)+.3);
        materialMatrix.push(Math.random()*(1-.3)+.3);
        materialMatrix.push(Math.random()*(1-.3)+.3);
    }
    //add a big red sphere
    if(event.keyCode =="81"){
        num_spheres++;
        
        positionMatrix.push(Math.random()*100-50);
        positionMatrix.push(Math.random()*100-50);
        positionMatrix.push(Math.random()*100-50);
        
        velocityMatrix.push(Math.random()*2-1);
        velocityMatrix.push(Math.random()*2-1);
        velocityMatrix.push(Math.random()*2-1);
        
        var new_scale = Math.random()*5+10;
        scaleMatrix.push(new_scale);
        scaleMatrix.push(new_scale);
        scaleMatrix.push(new_scale);
        
        materialMatrix.push(1);
        materialMatrix.push(0);
        materialMatrix.push(0);
    }
    //add a big green sphere
    if(event.keyCode =="87"){
        num_spheres++;
        
        positionMatrix.push(Math.random()*100-50);
        positionMatrix.push(Math.random()*100-50);
        positionMatrix.push(Math.random()*100-50);
        
        velocityMatrix.push(Math.random()*2-1);
        velocityMatrix.push(Math.random()*2-1);
        velocityMatrix.push(Math.random()*2-1);
        
        var new_scale = Math.random()*5+10;
        scaleMatrix.push(new_scale);
        scaleMatrix.push(new_scale);
        scaleMatrix.push(new_scale);
        
        materialMatrix.push(0);
        materialMatrix.push(1);
        materialMatrix.push(0);
    }
    //add a big blue sphere
    if(event.keyCode =="69"){
        num_spheres++;
        
        positionMatrix.push(Math.random()*100-50);
        positionMatrix.push(Math.random()*100-50);
        positionMatrix.push(Math.random()*100-50);
        
        velocityMatrix.push(Math.random()*2-1);
        velocityMatrix.push(Math.random()*2-1);
        velocityMatrix.push(Math.random()*2-1);
        
        var new_scale = Math.random()*5+10;
        scaleMatrix.push(new_scale);
        scaleMatrix.push(new_scale);
        scaleMatrix.push(new_scale);
        
        materialMatrix.push(0);
        materialMatrix.push(0);
        materialMatrix.push(1);
    }
    //remove most recent sphere
    if(event.keyCode =="90"){
        if(num_spheres>0){
            num_spheres--;

            positionMatrix.pop();
            positionMatrix.pop();
            positionMatrix.pop();

            velocityMatrix.pop();
            velocityMatrix.pop();
            velocityMatrix.pop();

            scaleMatrix.pop();
            scaleMatrix.pop();
            scaleMatrix.pop();

            materialMatrix.pop();
            materialMatrix.pop();
            materialMatrix.pop();
        }
    }
    //toggle gravity
    if(event.keyCode =="71"){
        gravity_toggle ? gravity_toggle = false : gravity_toggle = true;
    }
    //toggle drag
    if(event.keyCode =="68"){
        drag_toggle ? drag_toggle = false : drag_toggle = true;
    }
    //delete all spheres
    if(event.keyCode =="72"){
        num_spheres = 0;
        positionMatrix = [];
        scaleMatrix = [];
        velocityMatrix = [];
        materialMatrix = [];
    }
    //increase coefficient of resitution
    if(event.keyCode =="84"){
        if(cor<2){
            cor+=.1;
        }
    }
    //decrease coefficient of resitution
    if(event.keyCode =="89"){
        if(cor>.1){
            cor-=.1;
        }
    }
    //speed up
    if(event.keyCode =="74"){
        for(var i=0; i<num_spheres*3; i++){
            if(velocityMatrix[i] == 0){
                velocityMatrix[i] = Math.random()*.1-.05;
            }
            else if(velocityMatrix[i] > 0){
                velocityMatrix[i] += .05;
            }
            else{
                velocityMatrix[i] -= .05;
            }
        }
    }
    //slow down
    if(event.keyCode =="75"){
        for(var i=0; i<num_spheres*3; i++){
            if(velocityMatrix[i] < 0.05 && velocityMatrix[i] > -0.05){
                velocityMatrix[i] = 0;
            }
            else if(velocityMatrix[i] > 0){
                velocityMatrix[i] -= .05;
            }
            else{
                velocityMatrix[i] += .05;
            }
        }
    }
    //Create gravity demo
    if(event.keyCode =="76"){
        num_spheres = 0;
        positionMatrix = [];
        scaleMatrix = [];
        velocityMatrix = [];
        materialMatrix = [];
        gravity_toggle = true;
        cor = .95;
        
        for(var i=0; i<10; i++){
            for(var j=0; j<10; j++){
                num_spheres++;

                positionMatrix.push(Math.random()*100-50);
                positionMatrix.push(Math.random()*100-50);
                positionMatrix.push(Math.random()*100-50);

                velocityMatrix.push(0);
                velocityMatrix.push(1);
                velocityMatrix.push(0);

                var new_scale = 5;
                scaleMatrix.push(new_scale);
                scaleMatrix.push(new_scale);
                scaleMatrix.push(new_scale);

                materialMatrix.push(Math.random()*(1-.3)+.3);
                materialMatrix.push(Math.random()*(1-.3)+.3);
                materialMatrix.push(Math.random()*(1-.3)+.3);
            }
        }
    }
    //reset
    if(event.keyCode =="82"){
        num_spheres = 0;
        positionMatrix = [];
        scaleMatrix = [];
        velocityMatrix = [];
        materialMatrix = [];
        
        cor = .95;
        gravity_toggle = false;
        drag_toggle = false;
        
        eyePt = vec3.fromValues(0.0,0.0,150.0);
        viewDir = vec3.fromValues(0.0,0.0,-1.0);
        up = vec3.fromValues(0.0,1.0,0.0);
        viewPt = vec3.fromValues(0.0,0.0,0.0);
    }
}