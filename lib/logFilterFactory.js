'use strict';

module.exports = function(requestId) {
  var endMarker = 'END RequestId: ' + requestId + '\n';
  var startMarker = 'START RequestId: ' + requestId + '\n';

  return {
    isStartEvent: function(event) {
      return (event.message === startMarker);
    },

    isEndEvent: function(event) {
      return (event.message === endMarker);
    }
  };
};
