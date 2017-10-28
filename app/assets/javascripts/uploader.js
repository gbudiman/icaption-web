var uploader = function() {
  var button;
  var button_placebo;
  var form;
  var debug;
  var preview;
  var queue;
  var caption_wait;
  var caption_result;
  var topic_selector;
  var job_dictionary;
  var file_counter;

  var _load = function() {
    button = $('#btn-image-upload');
    button_placebo = $('#btn-placebo-disabled');
    form = $('#uploader-form');
    debug = $('#debug-output');
    //preview = $('#upload-preview');
    //caption_wait = $('#caption-wait');
    //caption_result = $('#caption-result');
    upload_progress_bar = $('#upload-progress-bar');
    result_pane = $('#result-pane');
    file_dropper = $('#file-dropper');
    topic_selector = $('#topic-selector');
    queue = 0;
    file_counter = 0;
    job_dictionary = {};

    file_dropper.fileinput({
      uploadUrl: '/receiver',
      uploadExtraData: function() {
        return {
          topic_id: topic_selector.selectpicker('val')
        }
      },
      allowedFileTypes: ['image'],
      showUpload: false,
      showBrowse: false,
      showRemove: true,
      showCaption: true
    }).on('filebatchselected', function(event, files) {
      file_dropper.fileinput('upload')
    }).on('fileuploaded', function(event, data, previewId, index) {
      job_dictionary[data.response.work_id] = {
        tries: 0,
        completed: false,
        file_id: file_counter
      };

      $('#' + file_dropper.fileinput('getFrames')[file_counter].id)
        .attr('retrieve-id', previewId)
        .find('.progress-bar')
          .addClass('progress-bar-striped active')
          .text('Waiting for response...');
      file_counter++;
      
    }).on('filebatchuploadcomplete', function(event, files, extra) {
      ping_for_result();
    }).on('filecleared', function(event) {
      file_counter = 0;
      job_dictionary = {};
    }).on('filesuccessremove', function(event, id) {
      file_counter--;
    })
  }

  var attach = function() {
    _load();
    // button.on('change', function() {
    //   debug.show();
    //   debug.empty();
      
    //   update_previewer(queue);
    //   send_to_server().then(function(work_id) {
    //     ping_for_result(work_id);
    //   });
    // })
  }

  var toggle_readiness = function(x) {
    

    if (x) {
      queue++;
      button.parent().parent().show();
      button_placebo.hide();
    } else {
      caption_wait = $('div[data-caption-wait=' + queue + ']');
      caption_result = $('div[data-caption-result=' + queue + ']');
      button.parent().parent().hide();
      button_placebo.show();
    }
  }

  var resize_previewer = function() {
    var target = $('img[data-caption-img-' + queue + ']');
    var max_width = target.parent().width();
    var max_height = 224;

    target.css('max-width', max_width + 'px');
    target.css('max-height', max_height + 'px');
  }

  var update_previewer = function(i) {
    var reader = new FileReader();

    reader.onload = function(e) {
      var t = '<div class="col-xs-6 text-center">'
            +   '<img data-caption-img-' + i + ' src="' + e.target.result + '" />'
            + '</div>'
            + '<div class="col-xs-6">'
            +   '<div class="caption-wait" data-caption-wait=' + i + '></div>'
            +   '<div data-caption-result=' + i + '></div>'
            + '</div>';
      result_pane.prepend('<div class="col-xs-12" style="margin-bottom:8px">' + t + '</div>');
      toggle_readiness(false);
      resize_previewer();

      caption_wait.show().text('Uploading file...');
      caption_result.hide();
    }

    reader.readAsDataURL(button[0].files[0]);
    
  }

  var ping_for_result = function() {
    var p_pattern = new RegExp(/\(p\=.+/);
    var interval = 2500;
    var intobj;
    var max_tries = 10;
    var tries = 0;

    //write_debug('Ping server at interval ' + interval + 'ms, MAX_TRIES = ' + max_tries);

    var _check_all_complete = function() {
      var all_complete = true;

      $.each(job_dictionary, function(job_id, d) {
        all_complete = all_complete && d.completed;

        if (!all_complete) return false;
      })

      return all_complete;
    }

    var check_all_complete = function() {
      if (_check_all_complete()) {
        clearInterval(intobj);
        job_dictionary = {};
      }
    }

    var _ping = function() {
      $.each(job_dictionary, function(job_id, d) {
        if (d.completed) return true;

        var frame_inf = file_dropper.fileinput('getFrames')[d.file_id];

        if (frame_inf == undefined) {
          d.completed = true;
          return true;
        }
        var mydom = $('#' + frame_inf.id);

        $.ajax({
          url: '/ping_result',
          type: 'GET',
          data: {
            work_id: job_id
          }
        }).done(function(res) {
          d.tries++;

          if (d.tries > max_tries) {
            mydom.find('.progress-bar')
              .text('Gave up :(')
              .removeClass('active progress-bar-striped')
              .removeClass('bg-success progress-bar-success')
              .addClass('bg-danger progress-bar-danger');
          }

          //console.log('Attempt #' + d.tries);
          if (res.status == 'pending') {
            mydom.find('.progress-bar')
              .text('Ping attempt #' + d.tries + '...')
              .addClass('active');
          } else if (res.status == 'completed') {

            d.completed = true;
            var width = mydom.width();

            mydom.find('.progress-bar').removeClass('active progress-bar-striped').text('Captioned!');
            if (mydom.find('.caption-result').length == 0) {
              mydom.find('.file-thumb-progress').after(

                '<div class="caption-result" style="width:' + width + 'px">'
              +   res.result.split('\n')[0].replace(p_pattern, '')
              + '</div>');
            }
          }

          check_all_complete();
        })
      })
    }
    // var _ping = function() {
    //   $.ajax({
    //     url: '/ping_result',
    //     type: 'GET',
    //     data: {
    //       work_id: work_id
    //     },
    //   }).done(function(res) {
    //     tries++;

    //     if (tries == max_tries) {
    //       clearInterval(intobj);
    //       write_debug('Giving up :(');
    //       upload_progress_bar.text('Gave up :(');
    //     }

    //     if (res.status == 'pending') {
    //       write_debug('Result not ready yet...')
    //     } else if (res.status == 'completed') {
    //       //write_debug(res.result);
    //       write_debug('Captioning completed!');
    //       caption_wait.hide();
    //       caption_result.show().html(res.result.split('\n')[0].replace(p_pattern, ''));
    //       clearInterval(intobj);
    //       upload_progress_bar.text('Captioning completed!');
    //       upload_progress_bar.parent().animate({
    //         opacity: 0
    //       }, 1000, function() {
    //         upload_progress_bar.parent().hide().css('opacity', 1);
    //         upload_progress_bar.css('width', '0%');
    //       });
    //       toggle_readiness(true);
    //     }
    //   })
    // }

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
      obj.append('topic_id', $('#topic-selector').selectpicker('val'));

      write_debug('Selected file: ' + input_file.name + ' (' + size + ')');
      write_debug('Transmitting file...');
      upload_progress_bar.parent().show();
      upload_progress_bar.css('width', '0%');

      $.ajax({
        url: '/receiver',
        type: 'POST',
        data: obj,
        cache: false,
        contentType: false,
        processData: false,
        xhr: function() {
          var my_xhr = new window.XMLHttpRequest()
          my_xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
              var l = parseFloat(e.loaded) / parseFloat(e.total) * 100;
              upload_progress_bar
                .css('width', l + '%')
                .text(parseInt(l) + '%');
            }
          }, false);

          return my_xhr;
        }
      }).done(function(res) {
        if (res != null && res.success) {
          write_debug('File received.')
          write_debug('Job ID: ' + res.work_id);
          write_debug('Topic ID: ' + res.topic_id);
          caption_wait.text('Waiting for result...')
          upload_progress_bar.text('Waiting for server response...');
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