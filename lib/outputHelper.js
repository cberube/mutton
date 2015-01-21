'use strict';

var BLOCK_DIVIDER =
  '========================================' +
  '========================================';

var TITLE_DIVIDER =
  '----------------------------------------' +
  '----------------------------------------';

var outputHelper = { };

outputHelper.displayBlock = function(title, content) {
  outputHelper.displayTitle(title);
  console.log(content);
  outputHelper.displayBlockDivider();
};

outputHelper.displayTitle = function(title) {
  outputHelper.displayBlockDivider();
  console.log(title);
  outputHelper.displayTitleDivider();
};

outputHelper.displayBlockDivider = function() {
  console.log(BLOCK_DIVIDER);
};

outputHelper.displayTitleDivider = function() {
  console.log(TITLE_DIVIDER);
};

module.exports = outputHelper;
