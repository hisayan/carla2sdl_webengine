function initGauge() {
  // さすがに Manticore で動かなかったので、手動で対応した。
  // html2canvas(document.getElementById("hmi")).then(function (canvas) {
  //     console.log(342);
  //     //imgタグのsrcの中に、html2canvasがレンダリングした画像を指定する。
  //     var imgData = canvas.toDataURL();
  //     console.log(imgData);
  //     document.getElementById("previewImg").src = imgData;
  //   }
  // );

  // nodejs ベースの開発環境からだと、
  // Chrome で、画面を明示的に表示しておかないと（タブ表示でバックグラウンドになってたりしたら）
  // Chrome が、描写を手抜きしたりするケースもあることに注意。
}

window.addEventListener('DOMContentLoaded', function() {
  // menu で背景を切り替えられるようにしたいけれど、まだ実装されていないためランダムに
  document.getElementById("bgimg").src = "./images/00" + (Math.floor(Math.random() * 5) + 1) + ".png";
});


function drawCanvas(params) {
  const board = document.getElementById("preview");
  const ctx = board.getContext("2d");

  ctx.drawImage(document.getElementById("bgimg"), 0, 0);

  document.gauges.get("compass").value = params.gps.heading;
  ctx.drawImage(document.getElementById("compass"), 10, 130, 240, 240);

  document.gauges.get("speed").value = params.speed;
  ctx.drawImage(document.getElementById("speed"), 260, 10, 360, 360);

  document.gauges.get("steer").value = params.steeringWheelAngle;
  ctx.drawImage(document.getElementById("steer"), 630, 130, 240, 240);

  const light_on = "rgba(255, 255, 0, .8)";
  const light_off = "rgba(0, 0, 0, .8)";

  // Turn Signal
  ctx.lineCap = "square";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000"

  // Turn Signal Left
  if (params.turnSignal == 'BOTH' || params.turnSignal == 'LEFT') {
    ctx.fillStyle = light_on;
  } else {
    ctx.fillStyle = light_off;
  }
  ctx.beginPath();
  ctx.lineWidth = 5;
  ctx.moveTo(25, 75);
  ctx.lineTo(50, 100);
  ctx.lineTo(50, 50);
  ctx.lineTo(25, 75);
  ctx.stroke();
  ctx.fill();

  // Turn Signal Right
  if (params.turnSignal == 'BOTH' || params.turnSignal == 'RIGHT') {
    ctx.fillStyle = light_on;
  } else {
    ctx.fillStyle = light_off;
  }
  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.moveTo(880 - 25, 75);
  ctx.lineTo(880 - 50, 100);
  ctx.lineTo(880 - 50, 50);
  ctx.lineTo(880 - 25, 75);
  ctx.stroke();
  ctx.fill();

  ctx.lineWidth = 3;

  // High Beam
  if (params.headLampStatus.highBeamsOn === true) {
    ctx.fillStyle = light_on;
  } else {
    ctx.fillStyle = light_off;
  }
  ctx.beginPath();
  ctx.arc(270, 340, 25, 0, Math.PI, true);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(880 - 270, 340, 25, 0, Math.PI, true);
  ctx.fill();
  ctx.stroke();

  // Low Beam
  if (params.headLampStatus.lowBeamsOn === true) {
    ctx.fillStyle = light_on;
  } else {
    ctx.fillStyle = light_off;
  }
  ctx.beginPath();
  ctx.arc(270, 340, 25, 0, Math.PI);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(880 - 270, 340, 25, 0, Math.PI);
  ctx.fill();
  ctx.stroke();

  // Console
  ctx.fillStyle = "rgba(0, 0, 0, .8)";
  roundRect(ctx, 10, 390, 860, 150, 10, true, false);

  const base_x = 20;
  const base_y = 400;

  ctx.font = "28px Led";
  ctx.fillStyle = "#0C0";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("LAT: " + params.gps.latitudeDegrees, 0 + base_x, 0 + base_y);
  ctx.fillText("LON: " + params.gps.longitudeDegrees, 0 + base_x, 28 + base_y);

  if (isNaN(params.accPedalPosition)) {
    ctx.fillText("ACCEL: -", 340 + base_x, 0 + base_y);
  } else {
    ctx.fillText("ACCEL: " + params.accPedalPosition.toFixed(2) + "%", 340 + base_x, 0 + base_y);
  }


  if (params.driverBraking == "YES") brake = "ON"; else brake = "OFF";
  ctx.fillText("BRAKE: " + brake, 340 + base_x, 28 + base_y);

  ctx.fillText("PRNDL: " + params.prndl, 640 + base_x, 0 + base_y);

  if (params.bodyInformation.parkBrakeActive === true) park = "ON"; else park = "OFF";
  ctx.fillText("PARK : " + park, 640 + base_x, 28 + base_y);

  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";

  ctx.fillText("[UTC] "
    + ("0000" + params.gps.utcYear).slice(-4)
    + "."
    + ("00" + params.gps.utcMonth).slice(-2)
    + "."
    + ("00" + params.gps.utcDay).slice(-2)
    + " "
    + ("00" + params.gps.utcHours).slice(-2)
    + ":"
    + ("00" + params.gps.utcMinutes).slice(-2)
    + ":"
    + ("00" + params.gps.utcSeconds).slice(-2)
    , 880 - base_x, 134 + base_y);

  return board.toDataURL();
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke === 'undefined') {
    stroke = true;
  }
  if (typeof radius === 'undefined') {
    radius = 5;
  }
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }

}