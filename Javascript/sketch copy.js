


//correct- trying to add recording functionality
let recording = false;
let recorder;
let chunks = [];

let button;
let displayState = 0;

const fr = 30;


let hMap = [];
let res = 8;
let contourInterval = 4;
let radius = 200; // Radius of the brush
let t = 0;
let move = true;

let motion = false;
let ios = false;

let xOffset = 0;
let yOffset = 0;
const cameraSpeed = 3;

let lat = 0;
let lon = 0;

let motionData = {
  z: 0,
  y: 0,
  x: 0,
  circleX: 0,
  circleY: 0
};

let compass;
let bearingToNorth = 0; // Initialize bearing to North

// Use a different name for the interval variable to avoid conflicts
let positionUpdateInterval;

if (typeof DeviceMotionEvent.requestPermission === 'function') {
  document.body.addEventListener('click', function() {
    DeviceMotionEvent.requestPermission()
      .then(function() {
        console.log('DeviceMotionEvent enabled');
        motion = true;
        ios = true;
      })
      .catch(function(error) {
        console.warn('DeviceMotionEvent not enabled', error);
      });
  });
} else {
  // Add detection for hardware for other devices if needed
}
function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(fr);
  record();
  addGUI();
 // canvas.parent('canvas-container'); // Attach the canvas to the canvas-container


  noStroke();
  background(230);

  // Initialize hMap with noise values
  for (let i = 0; i < width / res; i++) {
    hMap[i] = [];
    for (let j = 0; j < height / res; j++) {
      hMap[i][j] = noise(i / 50, j / 50) * 100;
    }
  }

  if (navigator.geolocation) {
    positionPing(); // Fetch initial position
    positionUpdateInterval = setInterval(positionPing, 1000); // Set up periodic position updates
  } else {
    alert("Geolocation is not supported by this browser.");
  }

  // Initialize compass (replace with actual initialization if using a specific library)
  compass = new Compass();
  compass.init(compassReady);
}

function draw() {
  background(230);

  let xMotion = map(rotationY, -90, 90, 0, width);
  let yMotion = map(rotationX, -90, 90, 0, height);

  let mx = xMotion / res;
  let my = yMotion / res;

  for (let i = 0; i < hMap.length; i++) {
    for (let j = 0; j < hMap[0].length; j++) {
      let d = dist(mx, my, i, j);
      if (d < radius / res) {
        let decrease = map(d, 0, radius / res, 30, 0);
        hMap[i][j] = max(0, hMap[i][j] - decrease);
      }
    }
  }

  // Draw colored elevation map
  noStroke();
  for (let i = 0; i < hMap.length; i++) {
    for (let j = 0; j < hMap[0].length; j++) {
      let elevation = hMap[i][j];
      let c = lerpColor(color(255, 0, 0), color(255, 255, 0), elevation / 100);
      fill(c);
      rect(i * res, j * res, res, res);
    }
  }

  // Draw contour lines
  for (let level = 0; level <= 100; level += contourInterval) {
    stroke(0, 150);
    strokeWeight(level % (contourInterval * 5) === 0 ? 2 : 1);

    for (let i = 0; i < hMap.length - 1; i++) {
      for (let j = 0; j < hMap[0].length - 1; j++) {
        let x = i * res;
        let y = j * res;
        let a = hMap[i][j];
        let b = hMap[i + 1][j];
        let c = hMap[i][j + 1];
        let d = hMap[i + 1][j + 1];

        drawContourLine(x, y, res, a, b, c, d, level);
      }
    }
  }

  // Display numeric values
  for (let i = 0; i < hMap.length; i += 5) {
    for (let j = 0; j < hMap[0].length; j += 5) {
      let elevation = round(hMap[i][j]);
      fill(255, 0, 0);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(10);
      text(elevation, i * res + res / 2, j * res + res / 2);
    }
  }

  // Draw motion-affected circle
  fill(255, 0, 0);
  noStroke();
  ellipse(xMotion, yMotion, 20); // Draw red circle

  // Save motion data
  motionData.z = round(rotationZ);
  motionData.y = round(rotationY);
  motionData.x = round(rotationX);
  motionData.circleX = xMotion;
  motionData.circleY = yMotion;

  // Instructions and values
  noStroke();
  fill(0);
  textAlign(LEFT);
  textSize(width / 35);
  textFont("'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace");

  /*
  text(`x: ${motionData.x}, y: ${motionData.y}, z: ${motionData.z}`, width / 6, 80);
  
  // Display geolocation
  text(`Lat: ${nf(lat, 2, 2)}`, width / 6, 100);
  text(`Lon: ${nf(lon, 2, 2)}`, width / 6, 120); */

  // Handle arrow key movements for xOffset and yOffset
  if (motionData.y > 30) {
    xOffset += cameraSpeed;
  }
  if (motionData.y < -40) {
    xOffset -= cameraSpeed;
  }
  if (motionData.x < -6) {
    yOffset -= cameraSpeed;
  }
  if (motionData.x > 40) {
    yOffset += cameraSpeed;
  }

  // Update hMap based on noise and time if move is true
  if (move) {
    for (let i = 0; i < width / res; i++) {
      for (let j = 0; j < height / res; j++) {
        hMap[i][j] = noise((i + t / 5 + xOffset) / 100, (j + sin(t / 10) + yOffset) / 100, t / 600) * 100;
      }
    }
    t += 0.5;
  }

  // Draw compass arrow if available
  if (bearingToNorth !== null) {
  //  text('Angle to North: ' + bearingToNorth.toFixed(2), width * 0.5, height * 0.25);
    drawCompassArrow(width - 80, height - 40, bearingToNorth); // Adjusted position for compass arrow
  }

  // Draw black arrow pointing towards xMotion and yMotion
  drawBlackArrowTowardsPoint(width - 80, height - 40, xMotion, yMotion);
}

function drawContourLine(x, y, size, a, b, c, d, level) {
  let points = [];

  if ((a < level && b >= level) || (a >= level && b < level))
    points.push(createVector(x + size * (level - a) / (b - a), y));

  if ((b < level && d >= level) || (b >= level && d < level))
    points.push(createVector(x + size, y + size * (level - b) / (d - b)));

  if ((c < level && d >= level) || (c >= level && d < level))
    points.push(createVector(x + size * (level - c) / (d - c), y + size));

  if ((a < level && c >= level) || (a >= level && c < level))
    points.push(createVector(x, y + size * (level - a) / (c - a)));

  if (points.length === 2) {
    line(points[0].x, points[0].y, points[1].x, points[1].y);
  }
}

function mouseDragged() {
  // Visual feedback (optional)
  noStroke();
  fill(0, 20);
  ellipse(mouseX, mouseY, radius * 2);
}

function keyPressed() {
  if (key === ' ') {
    move = !move;
  }
}

function handleError(error) {
  console.error(error);
}

function positionPing() {
  navigator.geolocation.getCurrentPosition(function(position) {
    lat = position.coords.latitude;
    lon = position.coords.longitude;
    console.log("Lat: " + lat + ", Lon: " + lon);
  }, handleError);
}

function drawCompassArrow(x, y, angle) {
  push();
  translate(x, y);
  rotate(radians(-90)); // Adjust to p5's coordinate system
  rotate(radians(angle)); // Rotate by the bearing angle

  stroke(255,0,0);
  strokeWeight(2);
  fill(255,0,0);

  // Draw arrow line
  line(0, 0, height/8, 0);

  // Draw arrowhead
  beginShape();
  vertex(height/8, 0);
  vertex(height/9, -5);
  vertex(height/9, 5);
  endShape(CLOSE);

  pop();
}

function drawBlackArrowTowardsPoint(x, y, targetX, targetY) {
  push();
  translate(x, y);
  
  // Calculate angle to target
  let angle = atan2(targetY - y, targetX - x);
  
  rotate(angle); // Rotate to point towards target
  
  stroke(0);
  strokeWeight(2);
  fill(0);

  // Draw arrow line
  line(0, 0, height/8, 0);

  // Draw arrowhead
  beginShape();
   vertex(height/8, 0);
  vertex(height/9, -5);
  vertex(height/9, 5);
  endShape(CLOSE);

  pop();
}

// Example Compass class (replace with actual implementation)
class Compass {
  constructor() {
    this.bearing = 0;
  }

  init(callback) {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (event) => {
        this.bearing = event.alpha; // Alpha is the compass direction in degrees
        bearingToNorth = this.bearing; // Update global bearingToNorth
      }, true);
      callback();
    } else {
      console.error('DeviceOrientationEvent is not supported.');
    }
  }
}

function compassReady() {
  console.log('Compass is ready.');
}


///record 


function record() {
  chunks.length = 0;
  
  let stream = document.querySelector('canvas').captureStream(fr);
  
  recorder = new MediaRecorder(stream);
  
  recorder.ondataavailable = e => {
    if (e.data.size) {
      chunks.push(e.data);
    }
  };
  
  recorder.onstop = exportVideo;
  
}

function exportVideo(e) {
  var blob = new Blob(chunks, { 'type' : 'video/' });

    // // Draw video to screen
    // var videoElement = document.createElement('video');
    // videoElement.setAttribute("id", Date.now());
    // videoElement.controls = true;
    // document.body.appendChild(videoElement);
    // videoElement.src = window.URL.createObjectURL(blob);
  
  // Download the video 
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  a.href = url;
  a.download = 'newVid.mp4';
  a.click();
  window.URL.revokeObjectURL(url);

}




function addGUI(){

  //add a button
  if(displayState == 0)
    {
        button = createButton("Begin Mapping");
    }else if(displayState == 1){
        button = createButton("Stop Mapping");
    }

  button.addClass("button");

//Add the play button to the parent gui HTML element
button.parent("gui-container");
  
//Adding a mouse pressed event listener to the button 
button.mousePressed(handleButtonPress); 

}

function handleButtonPress(){

  
  if(displayState < 1)
  {
    displayState++;
  }else{
    displayState = 0;
  }

  if(displayState == 0)
  {
      button.html("Begin Mapping");
      
      console.log("recording finished!");
      recorder.stop();
      
  }else if(displayState == 1){
      button.html("Stop Mapping");
      
      console.log("recording started!");
      recorder.start();
      
  }


}