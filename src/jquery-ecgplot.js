/* jquery-ecgplot.js
  =========================================================
  2012 Howard Hao-Yuan Chen

	A jQuery plugin for visualizing ecg data, supporting interactive mode by panning and zooming to a plot. This plugin 
	has dependency on flot and its plugins named 'jquery.flot.time.js' and 'jquery.flot.navigate.js'. 

	setting:{
		data : [],
		options : {
			rectangleRatio : 1, // the ratio of width/height of the minimum rectangle
			ecgLineWidth: {
				bold: 1.5,
				normal: 0.3
			},
			interactive : {
				enable: false,
				levelRange: null
			}
		}
	}
 
	"data" represent the ecg data sequence. Each element is in form of [ timestamp , value ], which means the 
	ecg data is 'value' when time goes to 'timestamp'.

	"rectangleRatio" means the ratio of width/height of the minimum rectangle in plot background. Each minimum 
	rectangle means 40ms in x-axes direction and 0.1mV in y-axes direction, which is the standard in real-world
	ecg plot. The default value '1' which means the minimum rectangle is square shape.

	"ecgLineWidth" means width among tow kind of lines in ecg plot. Every 5 normal lines must generateis 1 bold line, 
	which is the ecg real-world standard as well.

	"interactive" enables the drag/click behaviour to zoom/pan the plot. If you enable interactive for pan and zoom, 
	you have to assign levelRange to define the upper and lower bound of zooming scale. Also, you have to import flot 
	plugin: 'jquery.flot.navigate.js' to enable this function properly.
*/

;(function($){
	
	// an easy way to avoid exception from console undefined.
	function trace(s){
		try{ console.log(s); } catch(e){}	
	}

	// constants declaration
	var ecg_step_time_unit = 40; // each step in ECG chart xaxes: 40 ms
	var ecg_step_data_unit = 0.1; // each step in ECG chart yaxes: 0.1 mV

	//return the average value of given array "data"
	function getAvg(data){
		var avg = 0;
		for(var i=0; i < data.length ; i++){
			avg += data[i][1];
		}
		avg = avg / data.length;
		return avg;
	}

	// return the plot indicating data above ecg-like paper
	function ECGPlot(container, setting){
		var ecg_data = setting.data;

		// default is 1, means  the ecg_unit_step and time_unit_step form a square
		// if set as 0.1, means the ratio of time_unit_step over ecg_unit_step is 0.1
		var rectangleRatio = setting.options.rectangleRatio ;
		var ecgLineWidthNormal = setting.options.ecgLineWidth.normal;
		var ecgLineWidthBold = setting.options.ecgLineWidth.bold;
		var timeformat = setting.options.axes.timeformat;

		var time_start = ecg_data[0][0] ;
		var time_end = ecg_data[ecg_data.length - 1 ][0];
		var numXgridlines = (time_end - time_start) / ecg_step_time_unit;
		var numYgridlines = numXgridlines * container.height()/container.width(); 
		var ecg_avg = getAvg(ecg_data);

		var yaxes_min = ecg_avg - ( numYgridlines * 0.5 ) * ecg_step_data_unit * rectangleRatio ;
		var yaxes_max = ecg_avg + ( numYgridlines * 0.5 ) * ecg_step_data_unit * rectangleRatio ;

		function buildMarkings( axes, start, end, interval, steps){
			var markings = [];
			var counter = 0;
			for(var i= start; i < end ; i += interval, counter++){
				var aaa = new Object();
				aaa.from = i;
				aaa.to = i;
				var bbb = new Object();
				bbb.color = "#FF0000"; // Red
				if(axes == 'time'){  bbb.xaxis = aaa;}
				else if(axes == 'ecg'){ bbb.yaxis = aaa;}
				
				if(counter % steps == 0)
					bbb.lineWidth = ecgLineWidthBold;
				markings.push(bbb);
			}
			return markings;
		}

		function build_ecg_grid(){
			var ecg_grid_options = new Object();
			ecg_grid_options.markingsLineWidth = ecgLineWidthNormal;
			var xmarkings = buildMarkings('time' ,time_start, time_end, ecg_step_time_unit, 5);
			var ymarkings = buildMarkings('ecg' , parseFloat( yaxes_min.toFixed(1) ), yaxes_max, ecg_step_data_unit, 5);
			ecg_grid_options.markings = xmarkings.concat(ymarkings);

			if(setting.options.interactive.enable){
				ecg_grid_options.hoverable = false; 
				ecg_grid_options.clickable = false;
			}
			return ecg_grid_options;
		}

		var plot = $.plot(container ,[
			{
				data: ecg_data,
				color: "#000000"
			}
		],
		{
			lines: {show: true},
			points: {show: false},
			legend: {show: true },
			xaxis: {
				show : true,
				mode : "time",
				timeformat : timeformat,
				panRange :  [ time_start, time_end ], 
				min : time_start,
				max : time_end,
				tickLength : 20
			},
			yaxis:{
				show : true,
				panRange : [ yaxes_min, yaxes_max],
				min : yaxes_min,
				max : yaxes_max,
				tickSize : ecg_step_data_unit,
				tickDecimals : 2,
				minTickSize : ecg_step_data_unit
			},
			grid: build_ecg_grid(),
			zoom: {interactive: true},
			pan: {interactive : true}
		}
		);

		if(setting.options.interactive.enable != true)
			return plot;

		//calculate zoom configurtion based on setting object 
		container.unbind('plotpan');
		container.unbind('plotzoom');
		var lower_times = setting.options.interactive.levelRange.lower;
		var upper_times = setting.options.interactive.levelRange.upper;

		//set zoom lower bound 
		plot.zoom( {
			amount : Math.pow(1.5,lower_times), center: { left:plot.width()/2 , top:plot.height()/2}
		});
		var axes = plot.getAxes();
		var lo_xaxes_min = axes.xaxis.min;//.toFixed(2);
		var  lo_xaxes_max = axes.xaxis.max;//.toFixed(2);
		var lo_yaxes_min = axes.yaxis.min;//.toFixed(2);
		var lo_yaxes_max = axes.yaxis.max;//.toFixed(2);
		var lo_x_range = lo_xaxes_max - lo_xaxes_min;
		var lo_y_range = lo_yaxes_max - lo_yaxes_min;
		trace(' x zoom min range: ' + lo_x_range);
		trace(' y zoom min range: ' + lo_y_range);
		$('#x_max_range').text(lo_x_range);
		$('#y_max_range').text(lo_y_range);

		// set zoom upper bound
		plot.zoom( {
			amount : Math.pow(1.5, ( upper_times - lower_times)), 
			center: { left: plot.width()/2 , top: plot.height()/2}
		});
		var axes = plot.getAxes();
		var up_xaxes_min = axes.xaxis.min;//.toFixed(2);
		var up_xaxes_max = axes.xaxis.max;//.toFixed(2);
		var up_yaxes_min = axes.yaxis.min;//.toFixed(2);
		var up_yaxes_max = axes.yaxis.max;//.toFixed(2);
		var up_x_range = up_xaxes_max - up_xaxes_min;
		var up_y_range = up_yaxes_max - up_yaxes_min;
		trace(' x zoom max range: ' + up_x_range);
		trace(' y zoom min range: ' + up_y_range);
		$('#x_min_range').text(up_x_range);
		$('#y_min_range').text(up_y_range);
		axes.xaxis.options.zoomRange = [up_x_range  ,lo_x_range  ];
		axes.yaxis.options.zoomRange = [ up_y_range  ,lo_y_range  ];
/*
		var axes = plot.getAxes();
		var up_xaxes_min = axes.xaxis.min;//.toFixed(2);
		var up_xaxes_max = axes.xaxis.max;//.toFixed(2);
		var up_yaxes_min = axes.yaxis.min;//.toFixed(2);
		var up_yaxes_max = axes.yaxis.max;//.toFixed(2);
		var up_x_range = up_xaxes_max - up_xaxes_min;
		var up_y_range = up_yaxes_max - up_yaxes_min;
		$('#x_current_range').text(up_x_range);
		$('#y_current_range').text(up_y_range);
		return plot;
*/
	}


	// jQuery plugin function
	$.fn.ECGPlot = function(userSettings){
		var _defaultSettings = {
			data : [],
			options : {
				rectangleRatio : 1, // the ratio of width/height of the minimum rectangle
				axes:{
					timeformat : "%H:%M:%S",
				},
				ecgLineWidth: {
					bold: 1.5,
					normal: 0.3
				},
				interactive : {
					enable: false,
					levelRange: null
				}
			}
		};

		var settings = $.extend(_defaultSettings, userSettings);

		var t0 = new Date();
		var plot = ECGPlot($(this), settings);
		trace("time used (msecs): " + ((new Date()).getTime() - t0.getTime()) + 'ms');
		return plot;
	}

})(jQuery);

