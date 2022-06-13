inlets  = 1;
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


// -------------------------------------------------------------------------
// CC / PARAM MAPPING

var global_params = ['fx_mod_lfo_speed', 'fx_mod_depth', 'fx_delay_t', 'fx_delay_depth'];

var cc_param_map = {
	5:  'glide_t',

	14: 'eg1_a',
	15: 'eg1_d',
	16: 'eg1_s',
	17: 'eg1_r',

	18: 'eg2_a',
	19: 'eg2_d',
	20: 'eg2_s',
	21: 'eg2_r',

	22: 'cv2_src',
	23: 'cv2_a',

	24: 'lfo1_speed',
	25: 'lfo1_wave',
	26: 'lfo2_speed',
	27: 'lfo2_delay',

	28: 'eg1_kbd_track',
	29: 'eg1_trig',
	30: 'eg2_kbd_track',
	31: 'eg2_trig',

	34: 'osc1_wave',
	32: 'osc1_semi',
	33: 'osc1_fine',
	35: 'osc1_pw',

	38: 'osc2_wave',
	36: 'osc2_semi',
	37: 'osc2_fine',
	39: 'osc2_pw',
	40: 'osc2_track',
	41: 'osc2_sync',

	44: 'osc3_wave',
	42: 'osc3_semi',
	43: 'osc3_fine',

	45: 'mix_osc1',
	46: 'mix_osc2',
	47: 'mix_osc3',
	48: 'mix_noize',
	// 49: 'mix_in',

	50: 'filter_cutoff',
	51: 'filter_kbd_track',
	52: 'filter_eg1_a',
	53: 'filter_velo_sense',
	54: 'filter_mod_src',
	55: 'filter_mod_a',
	56: 'filter_reso',

	// 7:  'vca_level',
	57: 'vca_level',
	10: 'vca_pan',
	58: 'vca_velo_sense',

	60: 'pitch_mod_src',
	61: 'pitch_mod',
	62: 'glide_mode',
	63: 'pitchbend_scale',
	// 64: 'sustain_switch',

	102: 'arpeg_status',
	103: 'arpeg_range',
	104: 'arpeg_clock',
	105: 'arpeg_tempo',
	106: 'arpeg_mode',

	108: 'p1_src',
	109: 'p1_a',
	110: 'p1_dst',
	111: 'p2_src',
	112: 'p2_a',
	113: 'p2_dst',
	114: 'p3_src',
	115: 'p3_a',
	116: 'p3_dst',
	117: 'p3_src',
	118: 'p3_a',
	119: 'p3_dst',
};


var cc_param_convertion_fn = {
	'osc1_semi': function (v) {return v - 16 - 48;},
	'osc2_semi': function (v) {return v - 16 - 48;},
	'osc3_semi': function (v) {return v - 16 - 48;},

	'osc1_fine': function (v) {return v - 64;},
	'osc2_fine': function (v) {return v - 64;},
	'osc3_fine': function (v) {return v - 64;},
	'eg1_kbd_track': function (v) {return v - 64;},
	'eg2_kbd_track': function (v) {return v - 64;},
	'pitch_mod': function (v) {return v - 64;},
	'p1_a': function (v) {return v - 64;},
	'p2_a': function (v) {return v - 64;},
	'p3_a': function (v) {return v - 64;},
	'p4_a': function (v) {return v - 64;},
	'filter_kbd_track': function (v) {return v - 64;},
	'filter_eg1_a': function (v) {return v - 64;},
	'filter_velo_sense': function (v) {return v - 64;},
	'filter_mod_a': function (v) {return v - 64;},
	'amp_velo_sense': function (v) {return v - 64;},
};


function param_name_for_cc(b1) {
	return cc_param_map[b1];
}


// -------------------------------------------------------------------------
// MAIN


function parse_incoming_cc(b1, b2) {
	var prfx = jsarguments[1];
	var raw_msg = arrayfromargs(messagename,arguments);
	raw_msg = raw_msg.slice(1, raw_msg.length + 1);

	// log("-------------");

	// known CC
	var p_name = param_name_for_cc(b1);
	// log(" - "+p_name)
	if (p_name) {
		var val = b2;
		var convert_fn = cc_param_convertion_fn[p_name];
		if (convert_fn)
			val = convert_fn(val);
		//log(p_name, val);
		outlet(1, 1);
		d.replace(p_name, val);

		messnamed(prfx + p_name, val);
		//log(prfx + p_name, "=", val);
		return;
	}

	// else, let through
	log("CC:", b1, b2);
	outlet(0, raw_msg);
}
