(function($, undefined) {
  var root = this; // window
  
  //
  // A helper for converting a selection into an object
  //
  if(!$.fn.getOptions) {
    $.fn.getOptions = function(settings) {
      var select = this.filter('select').eq(0),
          options = {
            flip: false,
            html: false
          };
      $.extend(options, settings);
      
      // Nothing here
      if(select.length == 0) {
        return {};
      }
      
      var optionVals = {};
      
      select.find('option').each(function() {
        var op = $(this),
            label = options.html? op.html() : op.text(),
            val = op.attr('value') || label,
            inst = {
              value: val, 
              label: label,
              selected: !!op.attr('selected'),
              disabled: !!op.attr('disabled'),
              data: op.data(), // all the data attributes
              
              s: options.flip? val : label,
              toString: function() {
                return this.s;
              }
            };
        
        optionVals[(!options.flip ? val : label)] = inst;
      });
      
      return optionVals;
    };
  }
  
  //
  // The helper to create jQuery plugins
  //
  function jQueryPluginFactory( $, name, methods, getters ){
    getters = getters instanceof Array ? getters : [];
    var getters_obj = {};
    for(var i=0; i<getters.length; i++){
      getters_obj[getters[i]] = true;
    }
  
    
    // Create the object
    var Plugin = function(element){
      this.element = element;
    };
    Plugin.prototype = methods;
    
    // Assign the plugin
    $.fn[name] = function(){
      var args = arguments;
      var returnValue = this;
      
      this.each(function() {
        var $this = $(this);
        var plugin = $this.data('plugin-'+name);
        // Init the plugin if first time
        if( !plugin ){
          plugin = new Plugin($this);
          if(!plugin._init || plugin._init.apply(plugin, args) !== false){
            $this.data('plugin-'+name, plugin);
          }
          
        // call a method
        } else if(typeof args[0] == 'string' && args[0].charAt(0) != '_' && typeof plugin[args[0]] == 'function'){
          var methodArgs = Array.prototype.slice.call(args, 1);
          var r = plugin[args[0]].apply(plugin, methodArgs);
          // set the return value if method is a getter
          if( args[0] in getters_obj ){
            returnValue = r;
          }
        }
        
      });
      
      return returnValue; // returning the jQuery object
    };
  };
  
  
  
  //
  // Default options
  //
  var defaultOptions = {
    itemFormatter: function(option) {
      return '<i class="status">&#x2713;</i> '+option;
    }
  };
  
  
  
  //
  // Methods
  //
  var methods = {
    /**
     * Init
     */
    _init: function( options ) {
      // only run if the element is a select
      if(!this.element.is('select')) {
        return false;
      }
      
      // Options
      this._options = defaultOptions;
      $.extend(this._options, options || {html: true});
      
      // populate various values
      if(!this._options.placeholder) {
        this._options.placeholder = this.element.attr('placeholder') || this.element.attr('title') || $('label[for="'+this.element.attr('id')+'"]').text();
      }
      
      this._isMultiple = this.element.attr('multiple');
      
      // various settings
      this._isShowing = false; // flag for if drop down is showing
      
      this._val = []; // holds the current value
      
      this._optionsVals = this.element.getOptions(); // Get the options vals
      
      this._optionValueToElement = {}; // map a value to the element
      
      // Create the HTML
      this._container = this.element.wrap('<div class="unicorn-select"></div>').parent();
      
      this._button = $('<div class="unicorn-select-button"></div>').appendTo(this._container);
        this._buttonCount = $('<span class="unicorn-select-count"></span>').appendTo(this._button);
        this._buttonLabel = $('<span class="unicorn-select-placeholder"></span>').text(this._options.placeholder).appendTo(this._button);
        this._buttonToggle = $('<span class="unicorn-select-toggle">&#x25B2;</span>').appendTo(this._button);
      
      this._dropDown = $('<div class="unicorn-select-drop-down" style="display: none"></div>').appendTo(this._container);
        this._dropDownAllButton = $('<a class="unicorn-select-all">Select all</a>').appendTo(this._dropDown).css('display', this._isMultiple? '' : 'hide');
        this._dropDownList = $('<ul></ul>').appendTo(this._dropDown);
      
      // populate the drop down items
      for(var key in this._optionsVals) { 
        this._optionValueToElement[key] =
          $('<li></li>').appendTo(this._dropDownList)
            .toggleClass('selected', this._optionsVals[key].selected)
            .toggleClass('disabled', this._optionsVals[key].disabled)
            .data('value', this._optionsVals[key].value)
            .data('option', this._optionsVals[key])
            .html(this._options.itemFormatter(this._optionsVals[key]));
        
        if(this._optionsVals[key].selected && !this._optionsVals[key].disabled) {
          this._val.push(this._optionsVals[key].value);
        }
        
      }
      
      // Show the selected amount
      this._buttonCount.text(this._val.length);
      
      // Bind events
      this._button.on('click', $.proxy(this, '_buttonClick' ));
      this._dropDownAllButton.on( 'click', $.proxy(this, '_allButtonClick'));
      this._dropDownList.on( 'click', 'li', $.proxy(this, '_optionClick'));
    },
    
    
    
    /**
     * The button click handler
     */
    _buttonClick: function( event ) {
      this.toggle();
      return false; // Save the browser some time
    },
    
    
    /**
     *
     */
    _allButtonClick: function( event ) {
      this.selectAll( event );
      return false; // Save the browser some time
    },
    
    
    _optionClick: function( event ) {
    
      var val = $(event.target).data('value');
      this.toggleSelect(val, event);
    },
    
    /**
     * toggle the drop down
     */
    toggle: function( state, originalEvent ) {
      state = state === undefined ? !this._isShowing : state;
      
      this._trigger( state? 'show' : 'hide', {}, originalEvent );
    },
    
    
    
    /**
     * Handler to show the popup 
     */
    _onshow: function( event ) {
      this._container.addClass( 'unicorn-select-open' );
      this._isShowing = true;
      this._dropDown.css( 'display', '' );
    },
    
    
    /**
     * Handler to hide the popup
     */
    _onhide: function( event ) {
      this._container.removeClass( 'unicorn-select-open' );
      this._isShowing = false;
      this._dropDown.css( 'display', 'none' );
    },
    
    
    /**
     * Handle the selecting of an option
     */
    _onselect: function( event, data ) {
      var val = data.value;
      
      this._buttonCount.text(this._val.length);
      
      this._optionValueToElement[val].addClass('selected');
    },
    
    
    /**
     * Handle the unselecting of an option
     */
    _onunselect: function( event, data ) {
      var val = data.value;
      
      this._buttonCount.text(this._val.length);
      
      this._optionValueToElement[val].removeClass('selected');
    },
    
    
    /**
     * Handle the an option being disabled
     */
    _ondisable: function( event, data ) {
      var val = data.value;
      this._optionValueToElement[val].addClass('disabled');
    },
    
    
    
    /**
     * Handle the an option being disabled
     */
    _onenable: function( event, data ) {
      var val = data.value;
      this._optionValueToElement[val].removeClass('disabled');
    },
    
    
    
    /**
     * Get/set the current value
     */
    val: function( newVal ) {
      // setter
      if( newVal != undefined ) {
        // ensure it is an array
        if( !$.isArray( newVal ) ) {
          newVal = [ newVal ];
        }
        
        var same = [],
            removed = this._val.slice(0),
            added = [],
            index,
            v;
        
        while( newVal.length ) {
          v = newVal.pop();
          index = this._val.indexOf( v );
          if( index != -1 ) {
            same.push( v );
            removed.splice( index, 1 );
          } else {
            added.push( v );
          }
        }
        
        while( removed.length ) {
          this.unselect( removed.pop() );
        }
        
        while( added.length ) {
          this.select( added.pop() );
        }
      }
      
      return this._val;
    },
    
    
    
    /**
     * Enable an option
     */
    enable: function( val, originalEvent ) {
      if( this._optionsVals[val] && this.isDisabled( val ) ) {
        this._optionsVals[val].disabled = false;
        this._trigger( 'enable', {value: val}, originalEvent );
      }
    },
    
    
    
    /**
     * Disable an option
     */
    disable: function( val, originalEvent ) {
      if( this._optionsVals[val] && !this.isDisabled( val ) ) {
        this._optionsVals[val].disabled = true;
        if( this.isSelected( val ) ) {
          this.unselect( val );
        }
        
        this._trigger( 'disable', {value: val}, originalEvent );
      }
    },
    
    
    
    /**
     * Check if option is disabled
     */
    isDisabled: function( val ) {
      return this._optionsVals[val] && this._optionsVals[val].disabled;
    },
    
    
    
    /**
     * Select an option
     */
    select: function( val, originalEvent ) {
      // prevent selecting a non-existing value or disabled option
      if( !this._optionsVals[val] || this._optionsVals[val].disabled ) {
        return;
      }
      
      // can have multiple options selected
      if( this._isMultiple ) {
        // don't add it more than once
        if( !this.isSelected( val ) ) {
          this._val.push(val);
        }
      
      // only one option can be selected, unselect 
      } else {
        // first trigger the unselect event
        if( this._val.length ) {
          this._trigger( 'unselect', {value: this._val[0]}, originalEvent );
        }
        this._val = [ val ];
        
      }
      
      this._optionsVals[val].selected = true;
      this._trigger('select', {value: val}, originalEvent);
    },
    
    
    
    /**
     * Unselect an option
     */
    unselect: function( val, originalEvent ) {
      var i = this._val.indexOf( val );
      // check if it is selected
      if( i == -1 ) {
        return;
      }
      
      this._val.splice(i, 1);
      this._optionsVals[val].selected = false;
      
      this._trigger('unselect', {value: val}, originalEvent);
     },
     
     
     
    /**
     * Check if option is selected
     */
    isSelected: function( val ) {
      return this._val.indexOf( val ) != -1;
    },
    
    
    
    /**
     * Mass update the options
     */
    massUpdate: function( options ) {
      for(var val in options) {
        if( this._optionsVals[ val ] ) {
          if( options[val].disabled == false ) {
            this.disable( val );
          } else {
            this.enable( val );
            if( options[val].selected != false ) {
              this.select( val );
            } else {
              this.unselect( val );
            }
          }
        }
      }
    },
    
    
    
    /**
     * Select all the enabled options
     */
    selectAll: function( event ) {
      if( !this._isMultiple ) {
        return;
      }
      
      var oldVal = this._val;
      this._val = [];
      
      for( var v in this._optionsVals ) {
        if( !this._optionsVals[v].disabled ) {
          this._val.push( v );
          
          if( oldVal.indexOf( v ) == -1 ) {
            this._trigger( 'select', {value: v}, event );
          }
        }
      }
    },
    
    
    /**
     * Toggle the selection of a value
     */
    toggleSelect: function( val, event ) {
      (this._val.indexOf( val ) == -1 ? this.select : this.unselect).call( this, val, event );
    },
    
    
    /**
     * Trigger an event
     */
    _trigger: function( event, data, originalEvent ) {
      var d = {};
      data = data || {};

      if(originalEvent) {
        d.originalEvent = originalEvent;
      }
      
      var event = $.Event( event, d );
      
      // Allow built in event handlers
      if(this['_on'+event.type]) {
        if(this['_on'+event.type].call( this, event, data) === false) {
          return;
        }
      }
      
      this.element.trigger( event, data );
    }
  };
  
  
  // Getters
  var getters = ['isSelected', 'isDisabled', 'val'];
  
  
  // Create
  jQueryPluginFactory( $, 'unicornSelect', methods, getters );
  

})(jQuery);