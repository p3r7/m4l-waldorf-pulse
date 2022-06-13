inlets  = 2;
outlets = 2;


// -------------------------------------------------------------------------
// UTILS: LOG


function log() {
  for(var i=0,len=arguments.length; i<len; i++) {
    var message = arguments[i];
    if(message && message.toString) {
      var s = message.toString();
      if(s.indexOf("[object ") >= 0) {
        s = JSON.stringify(message);
      }
      post(s);
    }
    else if(message === null) {
      post("<null>");
    }
    else {
      post(message);
    }
  }
  post("\n");
}


// -------------------------------------------------------------------------
// UTILS: INTEROP

var d = new Dict("current_pgm");
var d_sysex = new Dict("current_pgm_sysex");
var d_midi = new Dict("midi_setup");
var prfx = jsarguments[1];


function reg (k, v) {
    d_sysex.set(k, v);
	//messnamed(prfx+k, v);
}

function regT (t_id, k, v) {
	d_sysex.replace([t_id, k].join('::'), v);

	//if (t_id == 1)
	//	messnamed(prfx+k, v);
}


// -------------------------------------------------------------------------
// UTILS: STRING

if(typeof(String.prototype.trim) === "undefined")
{
    String.prototype.trim = function()
    {
        return String(this).replace(/^\s+|\s+$/g, '');
    };
}

function reverseString(str) {
	return str.split("").reverse().join("");
}

function stringPadEnd(str, l, c) {
	while (str.length <= l) {
		str += c;
	}
	return str;
}

function stringToCharCodes(str) {
	var result = [];
	for (var i = 0; i < str.length; i++) {
		result[i] = str.charCodeAt(i);
	}
	return result;
}


// -------------------------------------------------------------------------
// UTILS: BINARY

function convert7to8bit(inputData) {
    var convertedData = [];
    var count = 0;
    var highBits = 0;
    for (var i = 0; i < inputData.length; i++) {
        var pos = i % 8; // relative position in this group of 8 bytes
        if (!pos) { // first byte
            highBits = inputData[i];
        }
        else {
            var highBit = highBits & (1 << (pos - 1));
            highBit <<= (8 - pos); // shift it to the high bit
            convertedData[count++] = inputData[i] | highBit;
        }
    }
    return convertedData;
}


function byteAsString(byte) {
	return stringPadEnd(reverseString((byte).toString(2)), 8, '0');
}

function bitsInByte(byte, from, to) {
	var asStr = byteAsString(byte);
	var bitsStr = asStr.substring(from, to);
	return parseInt(reverseString(bitsStr), 2);
}


// -------------------------------------------------------------------------
// UTILS: SYSEX

receiveBuffer = [];
completeMsg = null;

function recv(b) {
    if (b === 0xF0) { // new sysex
	    //log("got a new sysex msg")
        receiveBuffer = [b];
		completeMsg = null;
    }
    else if (b === 0xF7) { // end of sysex
        receiveBuffer.push(b);
        // slice off the 7-byte header and the 1-byte footer
        //var data = receiveBuffer.slice(7, receiveBuffer.length - 1);
        //var converted = convert7to8bit(data);
        // do something with the converted buffer here...
        //var convertedBack = convert8to7bit(converted); // test
        //for (var i in data) {
        //    if (data[i] !== convertedBack[i]) {
        //        post("there is a mismatch at byte " + i + "\n");
        //    }
        //}
		completeMsg = receiveBuffer;
        receiveBuffer = [];
    }
    else if (b & 0x80) {
        log("bad sysex byte, aborting receive");
        receiveBuffer = [];
    }
    else if (receiveBuffer.length) { // data byte, append to buffer
        receiveBuffer.push(b);
    }
}


// -------------------------------------------------------------------------
// UTILS: FILE

function writeBytesToFile (fname, bytes) {
	var f = new File(fname, "write", "Midi");
	if (f.isopen) {
		f.writebytes(bytes);
		f.eof = f.position;
		f.close();
		post("wrote to " + fname + "\n");
		return;
	}
	post("error writing to " + fname + "\n");
}

function readBytesFromFile (fname) {
	var f = new File(fname, "read");
	if (f.isopen) {
		var a = f.readbytes(f.eof);
		f.close();
		if (a) {
			post("read binary file " + fname + "\n");
			return a;
		}
	}
	post("error reading binary file " + fname + "\n");
	return null;
}



// -------------------------------------------------------------------------
// MAIN

function is_sysex_pulse_pgm_dump_req(bytes) {
	var device_id = d_midi.get('device_id');

	if (device_id !== 0 && ! device_id)
		return false;

	return bytes[1] === 62
		&& bytes[2] === 11
		&& bytes[3] === device_id
		&& bytes[4] === 64;
}

function is_sysex_pulse_pgm_dump_resp(bytes) {
	var device_id = d_midi.get('device_id');

	if (device_id !== 0 && ! device_id) {
		log("ERROR: unknown device id!");
		return false;
	}

	return bytes[1] === 0x3e // manufacturer: Waldorf Electronics GmbH
		&& bytes[2] === 0x0b // machine: Pulse
		&& bytes[3] === device_id // device id
		&& bytes[4] === 0x00 // pgm dump resp
	;
}

function parse_pulse_pgm_dump_resp(bytes) {
	var prfx = jsarguments[1];

	reg("pgm_id", bytes[5]);

	reg("osc1_semi", bytes[6] - 16 - 48); // aka "transpose"
	reg("osc1_fine", bytes[7] - 64); // aka "tune"
	reg("osc1_wave", bytes[8]); // aka "shape"
	reg("osc1_pw", bytes[9]);

	reg("osc2_semi", bytes[10] - 16 - 48);
	reg("osc2_fine", bytes[11] - 64);
	reg("osc2_wave", bytes[12]);
	reg("osc2_pw", bytes[13]);
	reg("osc2_sync", bytes[14]);
	reg("osc2_track", bytes[15]); // "keytrack"

	reg("osc3_semi", bytes[16] - 16 - 48);
	reg("osc3_fine", bytes[17] - 64);
	reg("osc3_wave", bytes[18]);

	reg("mix_osc1", bytes[19]);
	reg("mix_osc2", bytes[20]);
	reg("mix_osc3", bytes[21]);
	reg("mix_noize", bytes[22]);

	reg("lfo1_speed", bytes[23]);
	reg("lfo1_wave", bytes[24]); // "shape"
	reg("lfo2_speed", bytes[25]);
	reg("lfo2_delay", bytes[26]);

    // - EG1
    reg("eg1_a", bytes[27]);
    reg("eg1_d", bytes[28]);
    reg("eg1_s", bytes[29]);
    reg("eg1_r", bytes[30]);
    reg("eg1_kbd_track", bytes[31] - 64);
    reg("eg1_trig", bytes[32]);

    // - EG2
    reg("eg2_a", bytes[33]);
    reg("eg2_d", bytes[34]);
    reg("eg2_s", bytes[35]);
    reg("eg2_r", bytes[36]);
    reg("eg2_kbd_track", bytes[37] - 64);
    reg("eg2_trig", bytes[38]);

	// - PITCH
    reg("pitch_mod", bytes[39] - 64);
    reg("pitch_mod_src", bytes[40]);
    reg("glide_t", bytes[41]); // "portamento"
    reg("glide_mode", bytes[42]);
    reg("pitchbend_scale", bytes[43]);

	// - PATCH1
    reg("p1_src", bytes[44]);
	reg("p1_a", bytes[45] - 64);
	reg("p1_dst", bytes[46]);

	// - PATCH2
    reg("p2_src", bytes[47]);
	reg("p2_a", bytes[48] - 64);
	reg("p2_dst", bytes[49]);

	// - PATCH3
    reg("p3_src", bytes[50]);
	reg("p3_a", bytes[51] - 64);
	reg("p3_dst", bytes[52]);

	// - PATCH4
    reg("p4_src", bytes[53]);
	reg("p4_a", bytes[54] - 64);
	reg("p4_dst", bytes[55]);

	// - ARPEGGIO
	reg("arpeg_status", bytes[56]);
	reg("arpeg_range", bytes[57]);
	reg("arpeg_tempo", bytes[58]);
	reg("arpeg_clock", bytes[59]);
	reg("arpeg_mode", bytes[60]);

	// - VCF
	reg("filter_cutoff", bytes[61]);
	reg("filter_kbd_track", bytes[62] - 64);
	reg("filter_eg1_a", bytes[63] - 64);
	reg("filter_velo_sense", bytes[64] - 64);
	reg("filter_mod_src", bytes[65]);
	reg("filter_mod_a", bytes[66] - 64);
	reg("filter_reso", bytes[67]);

	// - VCA
	reg("vca_level", bytes[68]);
	reg("vca_velo_sense", bytes[69] - 64);
	reg("vca_pan", bytes[70] - 64);


	reg("checksum", bytes[75]);

	var checksumVal = 0;
	var i = 0;
	for (i = 6 ; i <= 74; i++) {
  		checksumVal += bytes[i];
	}
	//log("checksumVal", checksumVal)
	var checksumValBits = (checksumVal).toString(2);
	checksumBits = checksumValBits.substring(checksumValBits.length-7,  checksumValBits.length);
	log("checksumBits", checksumBits);
	var checksum = parseInt(checksumBits, 2);
	log("checksum_mine", checksum);
	
	log("checksum", bytes[75])
}

function curr_pgm_to_pgm_dump() {
    var bytes = [];

    if (d.length == 0) {
	return null;
    }

	bytes.push(0xF0);
	bytes.push(0x3e); // manufacturer: Waldorf Electronics GmbH
	bytes.push(0x0b); // machine: Pulse
	bytes.push(0); // // device id (0 = universal)
	bytes.push(0x00); // pgm dump resp
	
    bytes.push(d.get("osc1_semi") + 16 + 48); // aka "transpose"
    bytes.push(d.get("osc1_fine") + 64); // aka "tune"
    bytes.push(d.get("osc1_wave")); // aka "shape"
    bytes.push(d.get("osc1_pw"));

    bytes.push(d.get("osc2_semi") + 16 + 48);
    bytes.push(d.get("osc2_fine") + 64);
    bytes.push(d.get("osc2_wave"));
    bytes.push(d.get("osc2_pw"));
    bytes.push(d.get("osc2_sync"));
    bytes.push(d.get("osc2_track")); // "keytrack"

    bytes.push(d.get("osc3_semi") + 16 + 48);
    bytes.push(d.get("osc3_fine") + 64);
    bytes.push(d.get("osc3_wave"));

    bytes.push(d.get("mix_osc1"));
    bytes.push(d.get("mix_osc2"));
    bytes.push(d.get("mix_osc3"));
    bytes.push(d.get("mix_noize"));

    bytes.push(d.get("lfo1_speed"));
    bytes.push(d.get("lfo1_wave")); // "shape"
    bytes.push(d.get("lfo2_speed"));
    bytes.push(d.get("lfo2_delay"));

    // - EG1
    bytes.push(d.get("eg1_a"));
    bytes.push(d.get("eg1_d"));
    bytes.push(d.get("eg1_s"));
    bytes.push(d.get("eg1_r"));
    bytes.push(d.get("eg1_kbd_track") + 64);
    bytes.push(d.get("eg1_trig"));

    // - EG2
    bytes.push(d.get("eg2_a"));
    bytes.push(d.get("eg2_d"));
    bytes.push(d.get("eg2_s"));
    bytes.push(d.get("eg2_r"));
    bytes.push(d.get("eg2_kbd_track") + 64);
    bytes.push(d.get("eg2_trig"));

    // - PITCH
    bytes.push(d.get("pitch_mod") + 64);
    bytes.push(d.get("pitch_mod_src"));
    bytes.push(d.get("glide_t")); // "portamento"
    bytes.push(d.get("glide_mode"));
    bytes.push(d.get("pitchbend_scale"));

    // - PATCH1
    bytes.push(d.get("p1_src"));
    bytes.push(d.get("p1_a") + 64);
    bytes.push(d.get("p1_dst"));

    // - PATCH2
    bytes.push(d.get("p2_src"));
    bytes.push(d.get("p2_a") + 64);
    bytes.push(d.get("p2_dst"));

    // - PATCH3
    bytes.push(d.get("p3_src"));
    bytes.push(d.get("p3_a") + 64);
    bytes.push(d.get("p3_dst"));

    // - PATCH4
    bytes.push(d.get("p4_src"));
    bytes.push(d.get("p4_a") + 64);
    bytes.push(d.get("p4_dst"));

    // - ARPEGGIO
    bytes.push(d.get("arpeg_status"));
    bytes.push(d.get("arpeg_range"));
    bytes.push(d.get("arpeg_tempo"));
    bytes.push(d.get("arpeg_clock"));
    bytes.push(d.get("arpeg_mode"));

    // - VCF
    bytes.push(d.get("filter_cutoff"));
    bytes.push(d.get("filter_kbd_track") + 64);
    bytes.push(d.get("filter_eg1_a") + 64);
    bytes.push(d.get("filter_velo_sense") + 64);
    bytes.push(d.get("filter_mod_src"));
    bytes.push(d.get("filter_mod_a") + 64);
    bytes.push(d.get("filter_reso"));

    // - VCA
    bytes.push(d.get("vca_level"));
    bytes.push(d.get("vca_velo_sense") + 64);
    bytes.push(d.get("vca_pan") + 64);

    var checksumVal = 0;
    var i = 0;
    for (i = 6 ; i <= 74; i++) {
  	checksumVal += bytes[i];
    }
    //log("checksumVal", checksumVal)
    var checksumValBits = (checksumVal).toString(2);
    checksumBits = checksumValBits.substring(checksumValBits.length-7,  checksumValBits.length);
    // log("checksumBits", checksumBits);
    var checksum = parseInt(checksumBits, 2);
    // log("checksum_mine", checksum);

    bytes.push(checksum);

	bytes.push(0xF7);

    return bytes;
}

function parse_incoming_sysex(b) {
	recv(b);
	var currMsg = completeMsg;
	if(currMsg !== null) {
		if (is_sysex_pulse_pgm_dump_resp(currMsg)) {
			log("Is a PGM dump!");
			log(currMsg);
			parse_pulse_pgm_dump_resp(currMsg);
			outlet(0, currMsg); // output raw sysex to be stored
			outlet(1, 1); // tell message detected
		}
	}
}

function parse_outcoming_sysex(b) {
	recv(b);
	var currMsg = completeMsg;
	if(currMsg !== null) {
		if (is_sysex_pulse_pgm_dump_req(currMsg)) {
			log("Is a PGM dump request!");
			log(currMsg);
			outlet(1, 1); // tell message detected
		}
	}
}

function save_curr_pgm_sysex (filePath) {
    //var a = arrayfromargs(messagename,arguments);
    //var bytes = a.slice(2, a.length + 1);

	var bytes = curr_pgm_to_pgm_dump();

    if(bytes !== null) {
		log("dumping");
		log("bytes", bytes)
		writeBytesToFile(filePath, bytes);
    } else {
		log("no current pgm loaded");
    }
}

function open_pgm_sysex_file (filePath) {
	var bytes = readBytesFromFile(filePath);

    if (bytes !== null && is_sysex_pulse_pgm_dump_resp(bytes)) {
		//log("success", bytes);
		outlet(1, 1); // success
		outlet(0, bytes);
    } else {
		log("Cannot load, not a pgm dump in " + filePath);
		outlet(1, 0); // failure
    }
}
