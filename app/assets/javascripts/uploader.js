var uploader = function() {
  var button;
  var form;
  var debug;
  var preview;

  var _load = function() {
    button = $('#btn-image-upload');
    form = $('#uploader-form');
    debug = $('#debug-output');
    preview = $('#upload-preview');
    caption_result = $('#caption-result');

    resize_previewer();
  }

  var attach = function() {
    _load();
    button.on('change', function() {
      debug.show();
      debug.empty();
      update_previewer();
      send_to_server().then(function(work_id) {
        ping_for_result(work_id);
      });
    })
  }

  var resize_previewer = function() {
    var max_width = preview.parent().width();
    var max_height = 224;

    preview.css('max-width', max_width + 'px');
    preview.css('max-height', max_height + 'px');
  }

  var update_previewer = function() {
    var reader = new FileReader();

    reader.onload = function(e) {
      preview.attr('src', e.target.result);
    }

    reader.readAsDataURL(button[0].files[0]);
    caption_result.text('Waiting for result...')
  }

  var ping_for_result = function(work_id) {
    var interval = 2000;
    var intobj;

    write_debug('Ping server at interval ' + interval + 'ms');
    var _ping = function() {
      $.ajax({
        url: '/ping_result',
        type: 'GET',
        data: {
          work_id: work_id
        }
      }).done(function(res) {
        if (res.status == 'pending') {
          write_debug('Result not ready yet...')
        } else if (res.status == 'completed') {
          write_debug(res.result);
          write_debug('Captioning completed!');
          caption_result.text(res.result);
          clearInterval(intobj);
        }
      })
    }

    intobj = setInterval(_ping, interval);
  }

  var write_debug = function(x) {
    var d = new Date();
    var timestamp = d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();
    debug.prepend(d.toLocaleTimeString() + ' - ' + x + "\n");
  }

  var to_human_bytes = function(n) {
    if (n > 2000000) {
      return (parseFloat(n) / 1024 / 1024).toFixed(2) + ' MiB';
    } else if (n > 2000) {
      return (parseFloat(n) / 1024).toFixed(2) + ' KiB';
    }

    return (n) + ' B';
  }

  var send_to_server = function() {
    return new Promise(function(resolve, reject) {
      var obj = new FormData();
      var input_file = button[0].files[0];
      var size = to_human_bytes(input_file.size);

      // obj.append('section', 'general');
      // obj.append('action', 'previewImg');
      //console.log(input_file);
      obj.append('file', input_file);
      obj.append('filename', input_file.name);

      write_debug('Selected file: ' + input_file.name + ' (' + size + ')');
      write_debug('Transmitting file...');

      $.ajax({
        url: '/receiver',
        type: 'POST',
        data: obj,
        cache: false,
        contentType: false,
        processData: false,
        // xhr: function() {
        //   var my_xhr = $.ajaxSettings.xhr();
        //   if (my_xhr.upload) {
        //     myXhr.upload.addEventListener('progress', function(e) {
        //       if (e.lengthComputable) {
        //         console.log(e.loaded + '/' + e.total);
        //       }
        //     }, false);
        //   }

        //   return my_xhr;
        // }
      }).done(function(res) {
        if (res != null && res.success) {
          write_debug('File received.')
          write_debug('Job ID: ' + res.work_id);
          resolve(res.work_id);
        } else {
          write_debug('Server error :(');
        }
      })
    })
    
  }
  return {
    attach: attach
  }

}()