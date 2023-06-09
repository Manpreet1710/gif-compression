var DEFAULT_DELAY = 100;

function getPaletteSize(palette) {
	return (3 * Math.pow(2, 1 + bitToInt(palette.slice(5, 8))));
}

function getBitArray(num) {
	var bits = [];

	for(var i = 7; i >= 0; i--) {
		bits.push((num & (1 << i)) ? 1 : 0);
	}

	return bits;
}

function getDuration(duration) {
	return ((duration / 100) * 1000);
}

function bitToInt(bitArray) {
	return bitArray.reduce(function(s, n) { return s * 2 + n; }, 0);
}

function readSubBlock(view, pos, read) {
	var subBlock = {
		data: '',
		size: 0
	};

	while(true) {
		var size = view.getUint8(pos + subBlock.size, true);

		if(size === 0) {
			subBlock.size++;
			break;
		}

		if(read) {
			subBlock.data += String.fromCharCode.apply(String, new Uint8Array(view.buffer, pos + subBlock.size + 1, size));
		}

		subBlock.size += size + 1;
	}

	return subBlock;
}

function getNewImage() {
	return {
		identifier: '0',
		localPalette: false,
		localPaletteSize: 0,
		interlace: false,
		comments: [],
		text: '',
		left: 0,
		top: 0,
		width: 0,
		height: 0,
		delay: 0,
		disposal: 0
	};
}

function getInfo(sourceArrayBuffer) {
	var pos = 0;
	var index = 0;
	var subBlock;
	var unpackedField;

	var info = {
		valid: false,
		globalPalette: false,
		globalPaletteSize: 0,
		loopCount: 0,
		height: 0,
		width: 0,
		animated: false,
		images: [],
		isBrowserDuration: false,
		duration: 0,
		durationIE: 0,
		durationSafari: 0,
		durationFirefox: 0,
		durationChrome: 0,
		durationOpera: 0
	};

	var view = new DataView(sourceArrayBuffer);

	//needs to be at least 10 bytes long
	if(sourceArrayBuffer.byteLength < 10) {
		return info;
	}

	//GIF8
	if((view.getUint16(0) !== 0x4749) || (view.getUint16(2) !== 0x4638)) {
		return info;
	}

	//get width/height
	info.width = view.getUint16(6, true);
	info.height = view.getUint16(8, true);

	//not that safe to assume, but good enough by this point
	info.valid = true;

	//parse global palette
	unpackedField = getBitArray(view.getUint8(10, true));

	if(unpackedField[0]) {
		var globalPaletteSize = getPaletteSize(unpackedField);
		info.globalPalette = true;
		info.globalPaletteSize = (globalPaletteSize / 3);
		pos += globalPaletteSize;
	}

	pos += 13;

	var image = getNewImage();

	while(true) {
		try {
			var block = view.getUint8(pos, true);

			switch(block) {
				case 0x21: //EXTENSION BLOCK
					var type = view.getUint8(pos + 1, true);

					if(type === 0xF9) { //GRAPHICS CONTROL EXTENSION
						var length = view.getUint8(pos + 2);

						if(length === 4) {

							var delay = getDuration(view.getUint16(pos + 4, true));

							if(delay < 60 && !info.isBrowserDuration) {
								info.isBrowserDuration = true;
							}

							//http://nullsleep.tumblr.com/post/16524517190/animated-gif-minimum-frame-delay-browser-compatibility (out of date)
							image.delay = delay;
							info.duration += delay;
							info.durationIE += (delay < 60) ? DEFAULT_DELAY : delay;
							info.durationSafari += (delay < 20) ? DEFAULT_DELAY : delay;
							info.durationChrome += (delay < 20) ? DEFAULT_DELAY : delay;
							info.durationFirefox += (delay < 20) ? DEFAULT_DELAY : delay;
							info.durationOpera += (delay < 20) ? DEFAULT_DELAY : delay;

							//set disposal method
							unpackedField = getBitArray(view.getUint8(pos + 3));
							var disposal = unpackedField.slice(3, 6).join('');
							image.disposal = parseInt(disposal, 2);

							pos += 8;
						}
						else {
							pos++;
						}
					}
					else {
						pos += 2;

						subBlock = readSubBlock(view, pos, true);

						switch (type)
						{
							case 0xFF: //APPLICATION EXTENSION
								info.loopCount = view.getUint8(pos + 16, true);
								break;
							case 0xCE: //NAME
								/* the only reference to this extension I could find was in
									 gifsicle. I'm not sure ifthis is something gifsicle just
									 made up or ifthis actually exists outside of this app */
								image.identifier = subBlock.data;
								break;
							case 0xFE: //COMMENT EXTENSION
								image.comments.push(subBlock.data);
								break;
							case 0x01: //PLAIN TEXT EXTENSION
								image.text = subBlock.data;
								break;
						}

						pos += subBlock.size;
					}
					break;
				case 0x2C: //IMAGE DESCRIPTOR
					image.left = view.getUint16(pos + 1, true);
					image.top = view.getUint16(pos + 3, true);
					image.width = view.getUint16(pos + 5, true);
					image.height = view.getUint16(pos + 7, true);

					unpackedField = getBitArray(view.getUint8(pos + 9, true));

					if(unpackedField[0]) {
						//local palette?
						var localPaletteSize = getPaletteSize(unpackedField);
						image.localPalette = true;
						image.localPaletteSize = (localPaletteSize / 3);

						pos += localPaletteSize;
					}

					if(unpackedField[1]) {
						//interlaced?
						image.interlace = true;
					}

					//add image & reset object
					info.images.push(image);
					index++;

					//create new image
					image = getNewImage();
					image.identifier = index.toString();

					//set animated flag
					if(info.images.length > 1 && !info.animated) {
						info.animated = true;
					}

					pos += 11;

					subBlock = readSubBlock(view, pos, false);

					pos += subBlock.size;
					break;
				case 0x3B: //TRAILER BLOCK (THE END)
					return info;
				default: //UNKNOWN BLOCK (bad)
					pos++;
					break;
			}
		} catch(e) {
			info.valid = false;
			return info;
		}

		//this shouldn't happen, but if the trailer block is missing, we should bail at EOF
		if(pos >= sourceArrayBuffer.byteLength) {
			return info;
		}
	}

	return info;
}
