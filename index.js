const PART_XPOS     = 0; //  position
const PART_YPOS     = 1;
const PART_ZPOS     = 2;

const PART_R        =3; // color
const PART_G        =4;
const PART_B        =5;
const PART_A        =6;

const PART_SIZE     =7; // diameter (in pixels)

const PART_MAXVAR   =8; // Size of array

var VSHADER_SOURCE =
  'precision highp float;\n' +
  'attribute vec3 a_Position; \n' +
  'attribute vec4 a_Color; \n' +
  'attribute float a_size; \n' +
  'uniform mat4 u_cameraMatrix; \n' +
  'uniform mat4 u_xformMatrix; \n' +
  'varying   vec4 v_color; \n' +

  'void main() {\n' +

  '  v_color = a_Color; \n' +
  '   gl_Position = u_cameraMatrix * u_xformMatrix * vec4(a_Position.x -0.9, a_Position.y -0.9, a_Position.z, 1.0);  \n' +
  '  gl_PointSize = (a_Position.z / 100.0) * 2.0 + a_size; \n' +
  '  if ( gl_PointSize > a_size ) { \n' +
  '    gl_PointSize = a_size; \n' +
  '  } \n' +

  '} \n';

var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'varying vec4 v_color; \n' +

  'void main() {\n' +

  '  gl_FragColor = v_color; \n' +

  '} \n';

var timeStep = 1.0/30.0;
var g_last = Date.now();

var runMode = 3; //0=reset; 1= pause; 2=step; 3=run
var INIT_VEL = 5;

var system_1_partCount = 5000;
var system_2_partCount = 2000;
var system_3_partCount = 400;
var system_4_partCount = 30;

var system_1 = 'uninitialized particle_state';
var system_2 = 'uninitialized particle_state';
var system_3 = 'uninitialized particle_state';
var system_4 = 'uninitialized particle_state';

var system_2_emitter = 'uninitialized particle_emitter';
var system_3_boids   = 'uninitialized boids';
var system_4_spring  = 'uninitialized spring';

var fvx   = new Float32Array();

var mouseDrag = false;
var clickPos  = {x: 0, y: 0};
var dragTotal = {x: 0, y: 0};

var canvas;

var cameraMatrix, xformMatrix;

function cross(v,w) {
  return [  v[1]*w[2]-w[1]*v[2],
        v[2]*w[0]-w[2]*v[0],
        v[0]*w[1]-w[0]*v[1]
       ];
}

var ground =   [   //ground plane w/ color
          -500.0, -2, 600.0,    0.3, 0.6, 0.3, 1.0, 10,
          600.0,  -2, 600.0,    0.3, 0.6, 0.3, 1.0, 10,
          600.0,  -2, -500.0,   0.1, 1.0, 0.1, 1.0, 10,
          -500.0, -2, -500.0,   0.1, 1.0, 0.1, 1.0, 10
        ];

var pyramid =   [
          //bottom (in halves)
          -0.5, 0.0, 0.5,    1.0, 0.2, 0.2, 1.0, 10,
          -0.5, 0.0, -0.5,  1.0, 0.0, 1.0, 1.0, 10,
          0.5, 0.0, -0.5,    0.2, 0.2, 1.0, 1.0, 10,
          0.5, 0.0, -0.5,    0.2, 0.2, 1.0, 1.0, 10,
          0.5, 0.0, 0.5,    1.0, 1.0, 1.0, 1.0, 10,
          -0.5, 0.0, 0.5,    1.0, 0.2, 0.2, 1.0, 10,
          //front
          -0.5, 0.0, 0.5,    1.0, 0.2, 0.2, 1.0, 10,
          0.0, 0.75, 0.0,    0.1, 1.0, 0.1, 1.0, 10,
          0.5, 0.0, 0.5,    1.0, 1.0, 1.0, 1.0, 10,
          //right
          0.5, 0.0, 0.5,    1.0, 1.0, 1.0, 1.0, 10,
          0.0, 0.75, 0.0,    0.1, 1.0, 0.1, 1.0, 10,
          0.5, 0.0, -0.5,    0.2, 0.2, 1.0, 1.0, 10,
          //back
          0.5, 0.0, -0.5,    0.2, 0.2, 1.0, 1.0, 10,
          0.0, 0.75, 0.0,    0.1, 1.0, 0.1, 1.0, 10,
          -0.5, 0.0, -0.5,  1.0, 0.0, 1.0, 1.0, 10,
          //left
          -0.5, 0.0, -0.5,  1.0, 0.0, 1.0, 1.0, 10,
          0.0, 0.75, 0.0,    0.1, 1.0, 0.1, 1.0, 10,
          -0.5, 0.0, 0.5,    1.0, 0.2, 0.2, 1.0, 10
        ];

var box_vx = [
  //front
  0, 0, 0,
  1, 0, 0,
  1, 1, 0,
  1, 1, 0,
  0, 1, 0,
  0, 0, 0,
  // bottom
  0, 0, 0,
  1, 0, 0,
  1, 0, 1,
  1, 0, 1,
  0, 0, 1,
  0, 0, 0,
  // back
  0, 0, 1,
  1, 0, 1,
  1, 1, 1,
  1, 1, 1,
  0, 1, 1,
  0, 0, 1,
  // top
  0, 1, 0,
  1, 1, 0,
  1, 1, 1,
  1, 1, 1,
  0, 1, 1,
  0, 1, 0,
  // left
  0, 1, 0,
  0, 1, 1,
  0, 0, 1,
  0, 0, 1,
  0, 0, 0,
  0, 1, 0,
  // right
  1, 1, 0,
  1, 1, 1,
  1, 0, 1,
  1, 0, 1,
  1, 0, 0,
  1, 1, 0
  ];

box = [];

box_vx.forEach(function(pos, idx) {
  box.push(pos);
  if ((idx + 1) % 3 == 0) {
    switch (box_vx.slice(idx - 2, idx + 1).toString()) {
      case '0,1,0':
      case '1,0,0':
      case '1,1,0':
        // back
        box.push(0.5, 0.2, 0.8, 1.0, 10);
        break;
      case '0,0,0':
        // back bottom left
        box.push(0.2, 0.2, 0.5, 1.0, 10);
        break;
      case '0,0,1':
      case '1,0,1':
      case '0,1,1':
        // front
        box.push(0.7, 0.2, 0.7, 1.0, 10);
        break;
      case '1,1,1':
        // front top right corner
        box.push(0.9, 0.2, 0.9, 1.0, 10);
        break;
    }
  }
});

var animations = {
  rotatedFrameX: 0,
  rotatedFrameY: 0,
  rotateFrameX: 0,
  rotateFrameY: 0,
  eyeX: 180,
  eyeY: 150,
  eyeZ: 375,
  lookX: 25,
  lookY: 30,
  lookZ: 15,
  worldX: 0,
  worldY: 0,
  worldZ: 0,
  worldIX: -1.0,
  worldIY: 0,
  worldIZ: -5,
  cameraXI: 0,
  cameraYI: 0,
  cameraZI: 0,
  funnel: true,
  springForce: true
};

var selects = {
  system_1_force: 'flower_funnel',
  system_4_solver: 'explicit_euler'
};

var force_select = document.getElementById('force');
var solver_select = document.getElementById('solver');
var k_input = document.getElementById('k');

force_select.onchange = function(e) {
  selects.system_1_force = e.target.value;
};

solver_select.onchange = function(e) {
  selects.system_4_solver = e.target.value;
};

k_input.onchange = function(e) {
  system_4_spring.k = e.target.value;
}

function main () {
  canvas = document.getElementById('webgl');

  cameraMatrix = new Matrix4();
  xformMatrix  = new Matrix4();
  system_1 = new particle_state();

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas, false);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  canvas.onmousedown  =  function(ev){myMouseDown( ev, gl, canvas) };
  canvas.onmousemove =   function(ev){myMouseMove( ev, gl, canvas) };
  canvas.onmouseup =     function(ev){myMouseUp(   ev, gl, canvas)};

  var toggleFunnel = makeBtn("Toggle funnel");
  toggleFunnel.onclick = function () {
    animations.funnel = !animations.funnel;
  }
  document.body.appendChild(toggleFunnel);

  var toggleSpringForce = makeBtn("Toggle spring force");
  toggleSpringForce.onclick = function () {
    animations.springForce = !animations.springForce;
  }
  document.body.appendChild(toggleSpringForce);

  var start = { x: -1, y: -1 };

  canvas.onmousedown = function(event) {
    start.x = event.clientX;
    start.y = event.clientY;
    canvas.onmousemove = function (event) {
      animations.rotateFrameX = (0.08 * (event.clientX - start.x)) % 360;
      animations.rotateFrameY = (0.08 * (-1 * event.clientY + start.y)) % 360;
    }
  }

  canvas.ondblclick = function(event) {
    //reset to initial world coords and initial view angle
    animations.worldX = animations.worldIX;
    animations.worldY = animations.worldIY;
    animations.worldZ = animations.worldIZ;

    animations.rotatedFrameX = 0;
    animations.rotatedFrameY = 0;
  }

  canvas.onmouseup = function (event) {
    animations.rotatedFrameX += animations.rotateFrameX;
    animations.rotatedFrameY += animations.rotateFrameY;
    animations.rotateFrameX = animations.rotateFrameY = 0;
    canvas.onmousemove = null;
  }

  window.onkeypress = myKeyPress;

  window.onkeydown = function (event) {
    //shift
    if (event.keyCode === 16) animations.cameraYI = 10;
    //ctrl
    if (event.keyCode === 17) animations.cameraYI = -10;
    //up or w
    if (event.keyCode === 38 || event.keyCode === 87) animations.cameraZI = -10;
    //down or s
    if (event.keyCode === 40 || event.keyCode === 83) animations.cameraZI = 10;
    //<- or a
    if (event.keyCode === 37 || event.keyCode === 65) animations.cameraXI = -10;
    //-> or d
    if (event.keyCode === 39 || event.keyCode === 68) animations.cameraXI = 10;
    if (event.keyCode === 112) showHelp(event);
  }

  window.onkeyup = function (event) {
    animations.cameraXI = animations.cameraYI = animations.cameraZI = 0;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // initialize the particle system:
  PartSys_init(0, canvas); // 0 == full reset, bouncy-balls; 1==add velocity
  // 2 == set up spring-mass system; ...

  // create the Vertex Buffer Object
  var vertices = initVertexBuffers(gl);
  if (vertices < 0) {
    console.log('Failed to create the Vertex Buffer Object');
    return;
  }
  gl.clearColor(0, 0, 0, 1);    // RGBA color for clearing <canvas>

  // animate
  var tick = function() {
    timeStep = delta(timeStep);
    draw(gl, vertices, timeStep, animations);
    requestAnimationFrame(tick, canvas);
  };

  tick();
}

function delta(timeStep) {
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  return elapsed;
}

function draw(gl, n, timeStep, anim) {
  var accMod = new v3(),
      velMod = new v3(),
      posMod = new v3();

  gl.clear(gl.COLOR_BUFFER_BIT);

  cameraMatrix.setPerspective(30,
                              canvas.width / canvas.height,
                              50,
                              3000);

  cameraMatrix.lookAt(anim.eyeX, anim.eyeY, anim.eyeZ,   // Eye,
            anim.lookX, anim.lookY, anim.lookZ,   // look-At point
            0, 1, 0);  // UP vector

  var lookvec = [ anim.lookX - anim.eyeX,
          anim.lookY - anim.eyeY,
          anim.lookZ - anim.eyeZ ];

  var axis = cross([0, 1, 0], lookvec);

  var rotX = anim.rotatedFrameX + anim.rotateFrameX;

  cameraMatrix.rotate(rotX, 0, 1, 0);
  //strange workaround contrived to move the axis for up/down rotation when the view angle changes
  var axis2 = new Matrix4().setRotate(-rotX, 0, 1, 0).multiplyVector3(new Vector3(axis));
  cameraMatrix.rotate(anim.rotatedFrameY + anim.rotateFrameY, axis2.elements[0], axis2.elements[1], axis2.elements[2]);

  rotX = rotX - 20;

  xformMatrix.setTranslate(
    anim.worldX -= anim.cameraZI * Math.sin(-rotX * Math.PI/180) + anim.cameraXI * Math.cos(rotX * Math.PI/180),
    anim.worldY -= anim.cameraYI,
    anim.worldZ -= anim.cameraZI * Math.cos(-rotX * Math.PI/180) + anim.cameraXI * Math.sin(rotX * Math.PI/180)
  );

  gl.uniformMatrix4fv( u_cameraMatrix, false, cameraMatrix.elements );
  gl.uniformMatrix4fv( u_xformMatrix, false, xformMatrix.elements );

  if(runMode>1) {
    if(runMode==2) runMode=1;

    system_1.particles.forEach(function (p) {
      var pos = p.pos;
      var vel = p.vel;

      //Damping
      vel.y -= 0.03;
      vel.scale(0.98);

      if (anim.funnel) {
        system_1.force_fields.shift();
        system_1.add_force_field(force_fields.presets[selects.system_1_force]);
        system_1.apply_force_fields(p);
      }

      pos.add(vel);

      if (pos.x < 0.0 && vel.x < 0.0 || pos.x > 100 && vel.x > 0.0) {
        vel.x = -vel.x;
      }

      if (pos.y < 0.0 && vel.y < 0.0 || pos.y > 100 && vel.y > 0.0) {
        vel.y = -vel.y;
      }

      if (pos.z < 0.0 && vel.z < 0.0 || pos.z > 100 && vel.z > 0.0) {
        vel.z = -vel.z;
      }

      if (pos.x < 0.0) pos.x = 0;
      if (pos.x > 100) pos.x = 100;
      if (pos.y < 0.0) pos.y = 0;
      if (pos.y > 100.0) pos.y = 100;
      if (pos.z < 0.0) pos.z = 0;
      if (pos.z > 100) pos.z = 100;
    });

    system_2_emitter.update(function (p) {
      velMod.from(p.acc).scale(timeStep);
      p.acc.x *= (Math.random() * 0.003 + 0.002);
      p.acc.y -= Math.random() * 0.0001;
      p.acc.z *= (Math.random() * 0.003 + 0.002);
      p.vel.add(velMod);
    });

    var now = Date.now();

    system_2.particles.forEach(function (p) {
      system_2.apply_force_fields(p);
      posMod.from(p.vel).scale(timeStep);
      p.pos.add(posMod);

      var dt = (now - p.timeCreated);

      p.color.a = 0.8 - (p.pos.magnitude() / 150) - dt / 5000;
      p.color.g = 0.2 + Math.random() * 0.1 + 0.05 * Math.cos(0.002 * now);

      if (p.pos.magnitude() > 150
          || now - p.timeCreated > 5000) {
        system_2.generator(p);
      }
    });

    system_3_boids.flock();

    system_3.particles.forEach(function (p) {
      system_3.apply_force_fields(p);

      p.acc.scale(0.9);

      // wiggle a little
      p.vel.add((new v3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)).scale(0.02));

      velMod.from(p.acc).scale(0.1 * timeStep);
      p.vel.add(velMod);

      posMod.from(p.vel).scale(0.1 * timeStep);

      p.pos.add(posMod);

      var pos = p.pos, vel = p.vel;

      if (pos.x < 0.0 && vel.x < 0.0 || pos.x > 500 && vel.x > 0.0) {
        vel.x = -vel.x;
      }

      if (pos.y < 0.0 && vel.y < 0.0 || pos.y > 180 && vel.y > 0.0) {
        vel.y = -vel.y;
      }

      if (pos.z < 0.0 && vel.z < 0.0 || pos.z > 1100 && vel.z > 0.0) {
        vel.z = -vel.z;
      }

      if (pos.x < 0.0) pos.x = 0;
      if (pos.x > 500) pos.x = 500;
      if (pos.y < 0.0) pos.y = 0;
      if (pos.y > 180.0) pos.y = 180;
      if (pos.z < 0.0) pos.z = 0;
      if (pos.z > 1100) pos.z = 1100;
    });

    system_4_spring.update(solvers[selects.system_4_solver]);

    system_1.generateBuffer();
    system_2.generateBuffer();
    system_3.generateBuffer();
    system_4.generateBuffer();
  }

  var vx = ground.concat(pyramid);
  vx = vx.concat(box);
  vx = vx.concat(system_1.buffer);
  vx = vx.concat(system_2.buffer);
  vx = vx.concat(system_3.buffer);
  vx = vx.concat(system_4.buffer);

  fvx = new Float32Array(vx);

  PartSys_render(gl, fvx);  // Draw the particle-system on-screen:
}

// -- RENDER
function PartSys_render(gl, s) {
  var storedxformMatrix = new Matrix4();
  gl.bufferSubData(gl.ARRAY_BUFFER,
                                 0,
                                 s);

  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

  storedxformMatrix.set(xformMatrix);

  xformMatrix.translate(300, 0, -300);
  gl.uniformMatrix4fv( u_xformMatrix, false, xformMatrix.elements );

  gl.drawArrays(gl.POINTS, 58, system_1_partCount);

  // BOX TRANSFORM
  xformMatrix.set(storedxformMatrix);

  xformMatrix.translate(-150, 87, 300);
  xformMatrix.scale(100, 100, 100);

  gl.uniformMatrix4fv( u_xformMatrix, false, xformMatrix.elements );

  // DRAW BOX
  gl.drawArrays(gl.TRIANGLES, 22, 36);

  // PYRAMID TRANSFORM
  xformMatrix.set(storedxformMatrix);

  xformMatrix.translate(-200, 177, -100);
  xformMatrix.scale(100, 200, 100);

  gl.uniformMatrix4fv( u_xformMatrix, false, xformMatrix.elements );

  // DRAW PYRAMID
  gl.drawArrays(gl.TRIANGLES, 4, 18);

  // SYSTEM_3 TRANSFORM
  xformMatrix.set(storedxformMatrix);

  xformMatrix.translate(-500, 0, -500);
  gl.uniformMatrix4fv( u_xformMatrix, false, xformMatrix.elements );

  // DRAW SYSTEM_3
  gl.drawArrays(gl.POINTS, 58 + system_1_partCount + system_2_partCount, system_3_partCount);

  // SYSTEM_4 TRANSFORM
  xformMatrix.set(storedxformMatrix);

  xformMatrix.translate(300, 0, 450);
  gl.uniformMatrix4fv( u_xformMatrix, false, xformMatrix.elements );
  gl.drawArrays(gl.POINTS, 58 + system_1_partCount + system_2_partCount + system_3_partCount, system_4_partCount);

  // SYSTEM_2 TRANSFORM
  xformMatrix.set(storedxformMatrix);

  // DRAW SYSTEM_2
  xformMatrix.translate(400, 0, 100);
  gl.uniformMatrix4fv( u_xformMatrix, false, xformMatrix.elements );
  gl.drawArrays(gl.POINTS, 58 + system_1_partCount, system_2_partCount);
}

function PartSys_init(sel, canvas) {
  var vx = ground;
  vx = vx.concat(pyramid);
  vx = vx.concat(box); // 36

  switch(sel) {
    case 0:
      system_1 = new particle_state();
      system_1.populate(system_1_partCount, function (p) {

        var randOff = roundRand3D();

        p.pos.x = 0.2 + randOff[0];
        p.pos.y = 0.2 + randOff[1];
        p.pos.z = 50  + 50 * randOff[2];

        randOff = roundRand3D();

        p.vel.x = INIT_VEL * (0.4 + 0.2 * randOff[0]);
        p.vel.y = INIT_VEL * (0.4 + 0.2 * randOff[1]);
        p.vel.z = INIT_VEL * (0.2 + 0.8 * Math.random());

        p.color.r = 0.2 + 0.8 * Math.random();
        p.color.g = 0.2 + 0.8 * Math.random();
        p.color.b = 0.2 + 0.8 * Math.random();
        p.color.a = 1.0;

        p.mass = 0.9 + 0.2 * Math.random();

      });

      system_1.add_force_field(force_fields.presets.flower_funnel);

      system_1.generateBuffer();

      system_2 = new particle_state();
      system_2.populate(system_2_partCount, function (p) {
        var pos = roundRand2D();
        p.pos.y = -5;
        p.pos.x = 5 * pos[0];
        p.pos.z = 5 * pos[1];

        var acc = roundRand3D();
        p.acc.x = 0.002 * acc[0];
        p.acc.y = 0.003 + 0.0005 * acc[1];
        p.acc.z = 0.002 * acc[2];

        var off = roundRand2D();
        p.vel.x = 0;
        p.vel.y = 0;
        p.vel.z = 0;

        p.color.r = 0.8;
        p.color.g = 0.1 + 0.01 * Math.random();
        p.color.b = 0.1 + 0.01 * Math.random();
        p.color.a = 1.0;

        p.timeCreated = Date.now();

        p.mass = 0.9 + 0.2 * Math.random();
        p.size = 6.0;
      });

      system_2.add_force_field(force_fields.magnet(80, new v3(0, 90, 0)));

      system_2.generateBuffer();

      system_2_emitter = new particle_emitter(system_2);

      system_3 = new particle_state();
      system_3.populate(system_3_partCount, function (p) {
        var pos = roundRand3D();
        p.pos.x = 250 + 250 * pos[0];
        p.pos.y = 50 + 50 * pos[1];
        p.pos.z = 1100 * Math.random();

        if (p.pos.z < 900 && p.pos.z > 770 && p.pos.x < 370 && p.pos.x > 270 && p.pos.y < 100) {
          // inside of box; push outside
          p.pos.z += 120;
        }

        if (p.pos.z < 500 && p.pos.z > 400 && p.pos.x < 270 && p.pos.x > 170 && p.pos.y < 177) {
          // inside of pyramid; push outside
          p.pos.z = p.pos.z >= 450 ? p.pos.z + 50 : p.pos.z - 50;
        }

        p.vel = new v3(0.25, 0, 1);

        p.acc = new v3(0.001);

        p.color.r = 0.7 + 0.1 * Math.random();
        p.color.g = 0.7 + 0.1 * Math.random();
        p.color.b = 0.7 + 0.1 * Math.random();
        p.color.a = 1.0;

        p.timeCreated = Date.now();

        p.mass = 1.0;
        p.size = 6.0;
      });

      // 300 x 300 x 100 box; pyramid is at -200, -100 (upper left corner)
      system_3.add_force_field(force_fields.sphere_repulsor(100, new v3(220, 50, 450)));
      // box is at -150, 300
      system_3.add_force_field(force_fields.sphere_repulsor(120, new v3(320, 50, 800)));

      system_3.generateBuffer();

      system_3_boids = new boids(system_3);

      system_4 = new particle_state();
      system_4.populate(system_4_partCount, function (p,i) {
        p.size = 4.0;

        p.pos.x = 0;
        p.pos.y = 100 - i * p.size;
        p.pos.z = 0;

        p.facc.from(null_force);

        p.acc.from(null_force);
        if (i == system_4_partCount - 1) p.acc.x = 0.005;

        p.vel.from(null_force);

        p.color.r = 0.3 + 0.5 * (i / system_4_partCount);
        p.color.g = 0.3 + 0.5 * (i / system_4_partCount);
        p.color.b = 0.3 + 0.5 * (i / system_4_partCount);

        p.mass = 1.0;
      });

      system_4.generateBuffer();

      system_4_spring = new spring(system_4);

      vx = vx.concat(system_1.buffer);
      vx = vx.concat(system_2.buffer);
      vx = vx.concat(system_3.buffer);
      vx = vx.concat(system_4.buffer);

      break;
    case 1:  // increase current velocity by INIT_VEL
    default:
      system_1.particles.forEach(function(p) {
        if (p.vel.x > 0) {
          p.vel.x += (0.2 + 0.8 * Math.random()) * INIT_VEL;
        } else {
          p.vel.x -= (0.2 + 0.8 * Math.random()) * INIT_VEL;
        }
        if (p.vel.y > 0) {
          p.vel.y += (0.2 + 0.8 * Math.random()) * INIT_VEL;
        } else {
          p.vel.y -= (0.2 + 0.8 * Math.random()) * INIT_VEL;
        }
        if (p.vel.z > 0) {
          p.vel.z += (0.2 + 0.8 * Math.random()) * INIT_VEL;
        } else {
          p.vel.z -= (0.2 + 0.8 * Math.random()) * INIT_VEL;
        }
      });

      system_2.particles.forEach(system_2.generator);
      system_3.particles.forEach(system_3.generator);
      system_4.particles.forEach(system_4.generator);

      break;
   }

  fvx = new Float32Array(vx);
}

function roundRand2D() {
  //==============================================================================
  // On each call, make a different 2D point (xdisc, ydisc) chosen 'randomly'
  // and 'uniformly' inside a circle of radisu 1.0 centered at the origin.
  // More formally:
  //    --xdisc*xdisc + ydisc*ydisc < 1.0, and
  //    --uniform probability density function (PDF) within this radius=1 circle.
  //    (within this circle, all regions of equal area are equally likely to
  //    contain the the point (xdisc,ydisc)).
  var xy = [0,0];
  do {      // 0.0 <= Math.random() < 1.0 with uniform PDF.
    xy[0] = 2.0*Math.random() -1.0;      // choose an equally-likely 2D point
    xy[1] = 2.0*Math.random() -1.0;      // within the +/-1, +/-1 square.
    }
  while(xy[0]*xy[0] + xy[1]*xy[1] >= 1.0);    // keep 1st point inside circle
  return xy;
}

function roundRand3D() {
  //==============================================================================
  // On each call, find a different 3D point (xball, yball, zball) chosen
  // 'randomly' and 'uniformly' inside a sphere of radius 1.0 centered at origin.
  // More formally:
  //    --xball*xball + yball*yball + zball*zball < 1.0, and
  //    --uniform probability density function inside this radius=1 circle.
  //    (within this sphere, all regions of equal volume are equally likely to
  //    contain the the point (xball,yball,zball)).
  do {      // 0.0 <= Math.random() < 1.0 with uniform PDF.
    xball = 2.0*Math.random() -1.0;      // choose an equally-likely 2D point
    yball = 2.0*Math.random() -1.0;      // within the +/-1, +/-1 square.
    zball = 2.0*Math.random() -1.0;
    }
  while(xball*xball + yball*yball + zball*zball >= 1.0);    // keep 1st point inside sphere.
  ret = new Array(xball,yball,zball);
  return ret;
}

function initVertexBuffers(gl) {
  vertexBufferID = gl.createBuffer();

  if (!vertexBufferID) {
    console.log('Failed to create the gfx buffer object');
    return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferID);

 //    --STATIC_DRAW is for vertex buffers that are rendered many times,
 //        and whose contents are specified once and never change.
 //    --DYNAMIC_DRAW is for vertex buffers that are rendered many times, and
 //        whose contents change during the rendering loop.
 //    --STREAM_DRAW is for vertex buffers that are rendered a small number of
 //       times and then discarded.
 //  Recall that gl.bufferData() allocates and fills a new hunk of graphics
 //    memory.  We always use gl.bufferData() in the creation of a new buffer.
 //   In comparison, gl.bufferSubData() modifies contents of an existing buffer;
  gl.bufferData(gl.ARRAY_BUFFER,
                fvx,
                gl.DYNAMIC_DRAW);

  var FSIZE = fvx.BYTES_PER_ELEMENT;

  a_PositionID = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_PositionID < 0) {
    console.log('Failed to get the gfx storage location of a_Position');
    return -1;
  }

  gl.vertexAttribPointer(
    a_PositionID,
    3, // size
    gl.FLOAT,      // type
    false,        // normalize before use?
    PART_MAXVAR*FSIZE,// stride
    PART_XPOS*FSIZE);  // Offset

  gl.enableVertexAttribArray(a_PositionID);

  a_ColorID = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_ColorID < 0) {
    console.log('Failed to get the gfx storage location of a_Color');
    return -1;
  }

  gl.vertexAttribPointer(
    a_ColorID,
    4,
    gl.FLOAT,
    false,
    PART_MAXVAR * FSIZE,
    PART_R * FSIZE);

  gl.enableVertexAttribArray(a_ColorID);

  a_sizeID = gl.getAttribLocation(gl.program, 'a_size');
  if(a_sizeID < 0) {
    console.log('Failed to get the storage location of scalar a_size');
    return -1;
  }
  gl.vertexAttribPointer(
    a_sizeID,
    1,
    gl.FLOAT,
    false,
    PART_MAXVAR*FSIZE,
    PART_SIZE*FSIZE);

  gl.enableVertexAttribArray(a_sizeID);

  u_isParticle = gl.getUniformLocation(gl.program, 'u_isParticle');
  if (u_isParticle < 0) {
    console.log('Failed to fine u_isParticle oh no');
    return -1;
  }

  u_cameraMatrix = gl.getUniformLocation(gl.program, 'u_cameraMatrix');
  if (u_cameraMatrix < 0) {
    console.log('Failed to get u_cameraMatrix uniform');
    return -1;
  }

  u_xformMatrix = gl.getUniformLocation(gl.program, 'u_xformMatrix');
  if (u_xformMatrix < 0) {
    console.log('Failed to get u_xformMatrix uniform');
    return -1;
  }

  return system_1_partCount;
}


function myMouseDown(ev, gl, canvas) {
  var rect = ev.target.getBoundingClientRect();
  var xp = ev.clientX - rect.left;
  var yp = canvas.height - (ev.clientY - rect.top);

  var x = (xp - canvas.width/2) /
               (canvas.width/2);
  var y = (yp - canvas.height/2) /
               (canvas.height/2);

  mouseDrag = true;
  clickPos.x = x;
  clickPos.y = y;
};

function myMouseMove(ev,gl,canvas) {
  if (mouseDrag==false) return;

  var rect = ev.target.getBoundingClientRect();
  var xp = ev.clientX - rect.left;
  var yp = canvas.height - (ev.clientY - rect.top);

  var x = (xp - canvas.width/2)  /
               (canvas.width/2);
  var y = (yp - canvas.height/2) /
               (canvas.height/2);

  dragTotal.x += (x - clickPos.x);
  dragTotal.y += (y - clickPos.y);

  clickPos.x = x;
  clickPos.y = y;
};

function myMouseUp(ev,gl,canvas) {
  var rect = ev.target.getBoundingClientRect();
  var xp = ev.clientX - rect.left;
  var yp = canvas.height - (ev.clientY - rect.top);

  var x = (xp - canvas.width/2)  /
               (canvas.width/2);
  var y = (yp - canvas.height/2) /
               (canvas.height/2);

  mouseDrag = false;

  dragTotal.x += (x - clickPos.x);
  dragTotal.y += (y - clickPos.y);
  document.getElementById('MouseResult1').innerHTML =
  'myMouseUp(       ) at CVV coords x,y = '+x+', '+y+'<br>';
};

function myKeyPress(ev) {
  myChar = String.fromCharCode(ev.keyCode);

  switch(myChar) {
    case '0':
      runMode = 0; // RESET!
      break;
    case '1':
      runMode = 1; // PAUSE!
      break;
    case '2':
      runMode = 2; // STEP!
      break;
    case '3':       // RUN!
      runMode = 3;
      break;
    case 'R': // HARD reset: position AND velocity.
      runMode = 0; // RESET!
      PartSys_init(0);
      break;
    case 'r':  // 'SOFT' reset: boost velocity only.
      PartSys_init(1);
      break;
    case 'p':
    case 'P':      // toggle pause/run:
      if(runMode==3) runMode = 1;
                  else runMode = 3;
      break;
    case ' ':      // space-bar: single-step
      runMode = 2;
      break;
    default:
      break;
  }
}

function onPlusButton() {
  INIT_VEL *= 1.2;
  console.log('Initial velocity: '+INIT_VEL);
}

function onMinusButton() {
  INIT_VEL /= 1.2;
  console.log('Initial velocity: '+INIT_VEL);
}

/*
 * Start stuff that I actually wrote mostly.
 */

var v3 = function (x, y, z) {
  // NOTE(jordan): this was an interesting perf. fix
  // you gotta allocate them Numbers, I guess.
  x = x || 0;
  this.x = x;
  this.y = y == undefined ? x : y;
  this.z = z == undefined ? x : z;
};

v3.prototype.magnitude = function() {
  return Math.sqrt(this.x * this.x
                   + this.y * this.y
                   + this.z * this.z);
}

v3.prototype.selfNormalize = function () {
  var m = this.magnitude();
  this.x /= m;
  this.y /= m;
  this.z /= m;

  return this;
}

v3.prototype.normalize = function() {
  var mag = this.magnitude();
  return new v3(this.x / mag, this.y / mag, this.z / mag);
}

v3.prototype.subtract = function(d) {
  this.x -= d.x;
  this.y -= d.y;
  this.z -= d.z;

  return this;
}

v3.prototype.add = function(d) {
  this.x += d.x;
  this.y += d.y;
  this.z += d.z;

  return this;
}

v3.prototype.multiply = function (d) {
  this.x *= d.x;
  this.y *= d.y;
  this.z *= d.z;

  return this;
}

v3.prototype.scale = function(sx, sy, sz) {
  if (sy == undefined) sy = sx;
  if (sz == undefined) sz = sx;

  this.x *= sx;
  this.y *= sy;
  this.z *= sz;

  return this;
}

v3.prototype.abs = function() {
  this.x = Math.abs(this.x);
  this.y = Math.abs(this.y);
  this.z = Math.abs(this.z);

  return this;
}

v3.prototype.from = function(v) {
  this.x = v.x;
  this.y = v.y;
  this.z = v.z;

  return this;
}

var v4 = function (a, b, c, d) {
  this.r = this.x = a;
  this.g = this.y = b;
  this.b = this.z = c;
  this.a = this.w = d;
}

var particle = function () {
  this.pos = new v3();
  this.vel = new v3();
  this.acc = new v3();

  this.facc = new v3();

  this.timeCreated = Date.now();

  this.color = new v4(0,0,0,1.0);

  this.mass = 1;
  this.size = 4.0;
}

particle.MEMBER_COUNT = 8;

var particle_state = function () {
  this.particles = [];
  this.force_fields = [];
};

particle_state.prototype.populate = function(count, generator) {
  this.generator = generator;
  for (var particle_count = 0; particle_count < count; particle_count++) {
    var p = new particle();

    generator(p, particle_count);

    this.particles.push(p);
  }
}

particle_state.prototype.generateBuffer = function () {
  var member_count = particle.MEMBER_COUNT;
  var buff = this.buffer;
  var pl = this.particles.length;
  var p, bo;

  if (!buff)
    this.buffer = buff = new Array(pl * member_count);

  for ( var part_idx = 0; part_idx < pl; part_idx++ ) {

    bo = part_idx * member_count;

    p  = this.particles[part_idx];

    buff[bo + PART_XPOS] = p.pos.x;
    buff[bo + PART_YPOS] = p.pos.y;
    buff[bo + PART_ZPOS] = p.pos.z;

    buff[bo + PART_R]  = p.color.r;
    buff[bo + PART_G]  = p.color.g;
    buff[bo + PART_B]  = p.color.b;
    buff[bo + PART_A]  = p.color.a;

    buff[bo + PART_SIZE]  = p.size;
  }
}

particle_state.prototype.add_force_field = function (field) {
  this.force_fields.push(field);
}

particle_state.prototype.apply_force_fields = function (particle) {
  this.force_fields.forEach(function (fieldFn) {
    var f = fieldFn(particle);
    if (f.type == 'vel')
      particle.vel.add(f.scale(1/particle.mass));
    else
      particle.acc.add(f.scale(1/particle.mass));
  });
}

var null_force = new v3(0,0,0);

var force_fields = {};

force_fields.dampers = {};

force_fields.dampers.invSqrt = function (m) {
  return 1 / Math.sqrt(m);
}

// create a function that, given a position, creates a force
// pulling toward `center` so long as the position is within `size`
// radius (just use a box here, no need for fancy spheres)
// int size, v3 center
force_fields.magnet = function (radius, center, d) {
   return function (particle) {
     var particle_pos = particle.pos;
     var force = new v3();
     force.type = 'vel';
     force.from(center).subtract(particle_pos);
     var dist  = force.magnitude();
     if ( dist > radius ) { return null_force; }
     var damping_factor = d || 0.00005;
     return force.scale(damping_factor);
 }
}

force_fields.sphere_repulsor = function (radius, center) {
  return function (particle) {
    var particle_pos = particle.pos;
    var force = new v3();
    force.type = 'vel';
    force.from(particle_pos).subtract(center);
    var dist = force.magnitude();
    if ( dist > radius ) { return null_force; }
    var damping_factor = 0.001;
    return force.scale(damping_factor);
  }
}

force_fields.funnel = function (radius, center, damping) {
  if (damping == undefined) damping = function (dist) {
    return 1 / (2 * dist);
  }

  return function (particle) {
    var particle_pos = particle.pos;
    var force = new v3();
    force.type = 'vel';
    force.from(center).subtract(particle_pos);
    var dist  = force.magnitude();

    if (dist > radius) return null_force;
    if ( particle_pos.y > center.y ) {
      force.y = -force.y;
    }
    var damping_factor = damping(dist);
    return force.scale(damping_factor);
  }
}

force_fields.presets = {
  flower_funnel: force_fields.funnel(85, new v3(50, -1, 50)),
  basic_funnel: force_fields.funnel(70, new v3(50, 50, 50), function (dist) {
    return 1 / dist / dist;
  }),
  sphere_push: force_fields.sphere_repulsor(80, new v3(50, 50, 50)),
  high_magnet: force_fields.magnet(90, new v3(50, 50, 50), 0.01)
};

function makeBtn(text) {
  var b = document.createElement("button");
  b.textContent = text;
  return b;
}

var particle_emitter = function (size) {
  if (size instanceof particle_state) {
    this.state = size;
  } else {
    this.state = new particle_state();
    this.state.populate(size);
  }

  this.stride = this.state.particles.length / 10;
  this.offset = 0;

  this.add_update = function (p) {
    this.updates.push(p);
  }

  this.update = function (updater) {
    this.state.particles.slice(this.offset, this.offset + this.stride).forEach(function (p) {
      p.color.a = 1.0;
      updater(p);
    });

    this.offset = (this.offset + this.stride) % this.state.particles.length;
  }
}

var boids = function (size) {
  if (size instanceof particle_state) {
    this.state = size;
  } else {
    this.state = new particle_state();
    this.state.populate(size);
  }

  this.flock_distance = 100;
  this.flock_gap      = 15;
  // reuse nv; save TONS of performance
  var nv = new v3();

  this.neighbors = function (p, f) {
    var self = this;
    this.state.particles.forEach(function (n) {
      if (n != p) {
        nv.from(n.pos).subtract(p.pos);
        if (nv.magnitude() <= self.flock_distance)
          f(p, n, nv);
      }
    });
  }

  this.flock = function() {
    var neighbors;
    var self = this;
    this.state.particles.forEach(function(p) {
      // for all neighbors within flock_distance
      self.neighbors(p, function(p, n, nv) {
        // distance from neighbor
        var dist = nv.magnitude();
        // if you are too close, don't attract
        if (dist > self.flock_gap) {
          // accelerate toward neighbor
          p.acc.add(nv.normalize());
          // scale acceleration to deteriorate with distance
          p.acc.selfNormalize().scale(1.1 / dist);
          // scale velocity to a max of 0.9
          p.vel.selfNormalize().scale(0.9);
        }
      });
    });
  }
}

var spring = function (state, k) {
  this.state = state;

  // k cannot be 'falsy' -- undefined or 0, in this case
  this.k = k || 0.007;
  this.restLength = 1;

  var attraction = new v3();
  var m          = 0;

  this.attract = function (p, other) {
    // move toward other
    attraction.from(other.pos).subtract(p.pos);

    m = attraction.magnitude();

    // if distance > restLength, go toward
    // if distance < restLength, go away
    m = m - this.restLength;
    // don't forget spring constant
    m *= this.k;

    attraction.selfNormalize().scale(m);

    p.facc.add(attraction);
  }

  var some_fucking_small_force = (new v3(0.05, 0.05, 0.05));
  var gravity = (new v3(0, -0.01, 0));

  // F = -k * dx
  this.update = function (updater) {
    var self = this;
    var f    = new v3();

    this.state.particles.forEach(function (p, i) {
      var next = self.state.particles[i + 1];

      if (animations.springForce) {
        f.from(some_fucking_small_force).scale(Math.cos(0.001 * Date.now()), Math.random() * Math.sin(0.001 * Date.now()), Math.cos(0.01 * Math.random() * Date.now() + Math.PI));
        p.facc.add(f);
      }

      p.facc.add(gravity);

      if (next) {
        self.attract(next, p);
      }

      updater(p, i);
    });
  }
}

var solvers = {};

solvers.posMod = new v3();
solvers.accMod = new v3();
solvers.velMod = new v3();

solvers.explicit_euler = function (p, i) {
    // nah nah nah
    solvers.posMod.from(p.vel).scale(timeStep);
    if ( i > 0 ) p.pos.add(solvers.posMod);

    if (p.pos.y < 0) {
      if (p.facc.y < 0) {
        p.facc.y = -p.facc.y;
      }
      p.pos.y = 0;
    }

    p.acc.from(p.facc).scale(0.01 / p.mass);

    solvers.velMod.from(p.acc).scale(timeStep);
    p.vel.add(solvers.velMod).scale(0.85);

    p.facc.from(null_force);
}

solvers.implicit_euler = function (p, i) {
  solvers.posMod.from(p.vel).scale(timeStep);

  if ( i > 0 ) p.pos.add(solvers.posMod.scale(1 / (1 + timeStep * system_4_spring.k)));

  if (p.pos.y < 0) {
    if (p.facc.y < 0) {
      p.facc.y = -p.facc.y;
    }
    p.pos.y = 0;
  }

  p.acc.from(p.facc).scale(0.01 / p.mass);

  solvers.velMod.from(p.acc).scale(timeStep);
  p.vel.add(solvers.velMod).scale(0.85);

  p.facc.from(null_force);
}

solvers.midpoint = function (p, i) {
  solvers.posMod.from(p.vel).scale(timeStep / 2);

  if ( i > 0 ) p.pos.add(solvers.posMod);

  if (p.pos.y < 0) {
    if (p.facc.y < 0) {
      p.facc.y = -p.facc.y;
    }
    p.pos.y = 0;
  }

  p.acc.from(p.facc).scale(0.01 / p.mass);

  solvers.velMod.from(p.acc).scale(timeStep / 2);
  p.vel.add(solvers.velMod).scale(0.85);

  p.facc.from(null_force);
}

solvers.implicit_midpoint = function (p, i) {
  solvers.posMod.from(p.vel).scale(timeStep / 2);

  if ( i > 0 ) p.pos.add(solvers.posMod.scale(1 / (1 + timeStep * system_4_spring.k)));

  if (p.pos.y < 0) {
    if (p.facc.y < 0) {
      p.facc.y = -p.facc.y;
    }
    p.pos.y = 0;
  }

  p.acc.from(p.facc).scale(0.01 / p.mass);

  solvers.velMod.from(p.acc).scale(timeStep / 2);
  p.vel.add(solvers.velMod).scale(0.85);

  p.facc.from(null_force);
}

solvers.implicit_midpoint_double_step = function (p, i) {
  solvers.posMod.from(p.vel).scale(timeStep / 2);

  p.acc.from(p.facc).scale(0.01 / p.mass);

  solvers.velMod.from(p.acc).scale(timeStep / 2);
  p.vel.add(solvers.velMod).scale(0.85);

  solvers.accMod.from(p.vel).scale(timeStep / 2);
  solvers.posMod.add(solvers.accMod);

  if ( i > 0 ) p.pos.add(solvers.posMod.scale(1 / (1 + timeStep / 2 * system_4_spring.k)));

  if (p.pos.y < 0) {
    if (p.facc.y < 0) {
      p.facc.y = -p.facc.y;
    }
    p.pos.y = 0;
  }

  p.facc.from(null_force);
}

solvers.implicit_euler_avg = function (p, i) {
  solvers.posMod.from(p.vel).scale(timeStep);
  solvers.accMod.from(solvers.posMod).scale(1 / (1 + timeStep * system_4_spring.k));

  if ( i > 0 ) p.pos.add(solvers.posMod.add(solvers.accMod).scale(0.5));

  if (p.pos.y < 0) {
    if (p.facc.y < 0) {
      p.facc.y = -p.facc.y;
    }
    p.pos.y = 0;
  }

  p.acc.from(p.facc).scale(0.01 / p.mass);

  solvers.velMod.from(p.acc).scale(timeStep);
  p.vel.add(solvers.velMod).scale(0.85);

  p.facc.from(null_force);
}

solvers.midpoint_explicit_avg = function (p, i) {
  solvers.posMod.from(p.vel).scale(timeStep / 2);
  solvers.accMod.from(p.vel).scale(timeStep);

  if ( i > 0 ) p.pos.add(solvers.posMod.add(solvers.accMod).scale(0.5));

  if (p.pos.y < 0) {
    if (p.facc.y < 0) {
      p.facc.y = -p.facc.y;
    }
    p.pos.y = 0;
  }

  p.acc.from(p.facc).scale(0.01 / p.mass);

  solvers.velMod.from(p.acc).scale(timeStep);
  p.vel.add(solvers.velMod).scale(0.85);

  p.facc.from(null_force);
}

solvers.implicit_midpoint_avg = function (p, i) {
  solvers.posMod.from(p.vel).scale(timeStep / 2);
  solvers.accMod.from(p.vel).scale(1 / (1 + timeStep * system_4_spring.k));

  if ( i > 0 ) p.pos.add(solvers.posMod.add(solvers.accMod).scale(0.5));

  if (p.pos.y < 0) {
    if (p.facc.y < 0) {
      p.facc.y = -p.facc.y;
    }
    p.pos.y = 0;
  }

  p.acc.from(p.facc).scale(0.01 / p.mass);

  solvers.velMod.from(p.acc).scale(timeStep);
  p.vel.add(solvers.velMod).scale(0.85);

  p.facc.from(null_force);
}

solvers.implicit_midpoint_avg_double_step = function (p, i) {
  solvers.posMod.from(p.vel).scale(timeStep / 2);
  solvers.accMod.from(p.vel).scale(1 / (1 + timeStep * system_4_spring.k));

  p.acc.from(p.facc).scale(0.01 / p.mass);

  solvers.velMod.from(p.acc).scale(timeStep);
  p.vel.add(solvers.velMod).scale(0.85);

  solvers.velMod.from(p.vel).scale(timeStep / 2);
  solvers.posMod.add(solvers.velMod);

  solvers.velMod.from(p.vel).scale(1 / (1 + timeStep * system_4_spring.k));
  solvers.accMod.add(solvers.velMod);

  if ( i > 0 ) p.pos.add(solvers.posMod.add(solvers.accMod).scale(0.5));

  if (p.pos.y < 0) {
    if (p.facc.y < 0) {
      p.facc.y = -p.facc.y;
    }
    p.pos.y = 0;
  }

  p.facc.from(null_force);
}

