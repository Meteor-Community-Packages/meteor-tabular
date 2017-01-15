/*! DataTables Semantic integration
 */

/**
 * DataTables integration for Semantic UI. This requires Semantic UI and
 * DataTables 1.10 or newer.
 *
 * This file sets the defaults and adds options to DataTables to style its
 * controls using Semantic-UI. See http://datatables.net/manual/styling/
 * for further information.
 */
 (function( factory ){
	if ( typeof define === 'function' && define.amd ) {
		// AMD
		define( ['jquery', 'datatables.net'], function ( $ ) {
			return factory( $, window, document );
		} );
	}
	else if ( typeof exports === 'object' ) {
		// CommonJS
		module.exports = function (root, $) {
			if ( ! root ) {
				root = window;
			}

			if ( ! $ || ! $.fn.dataTable ) {
				// Require DataTables, which attaches to jQuery, including
				// jQuery if needed and have a $ property so we can access the
				// jQuery object that is used
				$ = require('datatables.net')(root, $).$;
			}

			return factory( $, root, root.document );
		};
	}
	else {
		// Browser
		factory( jQuery, window, document );
	}
}(function( $, window, document, undefined ) {
  'use strict';
  var DataTable = $.fn.dataTable;

  $.extend( true, DataTable.defaults, {
  	dom:
  		"<'left aligned eight wide column'l><'right aligned eight wide column'f>" +
  		"<'sixteen wide column'tr>" +
  		"<'left aligned four wide column'i><'right aligned twelve wide column'p>",
  	renderer: 'semantic'
  } );


  $.extend( DataTable.ext.pager, {
  		full_numbers_icon: DataTable.ext.pager.full_numbers
  });

  /* Default class modification */
  $.extend( DataTable.ext.classes, {
  	sWrapper:      "ui grid dataTables_wrapper ",
  	sFilterInput:  "",
  	sLengthSelect: ""
  } );

  /* Semantic-UI paging button renderer */
  DataTable.ext.renderer.pageButton.semantic = function ( settings, host, idx, buttons, page, pages ) {
  	var api     = new DataTable.Api( settings );
  	var classes = settings.oClasses;
  	var lang    = settings.oLanguage.oPaginate;
  	var btnDisplay, btnClass, btnIcon, counter=0;
      var addIcons = (( !api.init().pagingType ? '' : api.init().pagingType.toLowerCase() ).indexOf('icon') !== -1 );

  	var attach = function( container, buttons ) {
  		var i, ien, node, button;
  		var clickHandler = function ( e ) {
  			e.preventDefault();
  			if ( !$(e.currentTarget).hasClass('disabled') ) {
  				api.page( e.data.action ).draw( 'page' );
  			}
  		};

  		for ( i=0, ien=buttons.length ; i<ien ; i++ ) {
  			button = buttons[i];

  			if ( $.isArray( button ) ) {
  				attach( container, button );
  			}
  			else {
  				btnDisplay = '';
  				btnClass = '';
                  btnIcon = '';
  				switch ( button ) {
  					case 'ellipsis':
  					    btnDisplay = ( addIcons  ? '<i class="mini ellipsis horizontal icon"></i>' : '&hellip;');
  						btnClass = 'disabled';
  						break;

  					case 'first':
  					    btnIcon = ( addIcons ? '<i class="angle single left icon"></i>' : '');
  						btnDisplay = btnIcon + lang.sFirst;
  						btnClass = button + (page > 0 ?
  							'' : ' disabled');
  						break;

  					case 'previous':
  					    btnIcon = ( addIcons ? '<i class="angle double left icon"></i>' : '');
  						btnDisplay = btnIcon + lang.sPrevious;
  						btnClass = button + (page > 0 ?
  							'' : ' disabled');
  						break;

  					case 'next':
                          btnIcon = ( addIcons ? '<i class="angle double right icon"></i>' : '');
  						btnDisplay = lang.sNext + btnIcon;
  						btnClass = button + (page < pages-1 ?
  							'' : ' disabled');
  						break;

  					case 'last':
                          btnIcon = ( addIcons ? '<i class="angle single right icon"></i>' : '');
  						btnDisplay = lang.sLast + btnIcon;
  						btnClass = button + (page < pages-1 ?
  							'' : ' disabled');
  						break;

  					default:
  						btnDisplay = button + 1;
  						btnClass = page === button ?
  							'active' : '';
  						break;
  				}



  				if ( btnDisplay ) {
  					node = $('<a>', {
  							'class': classes.sPageButton+' '+btnClass+' item ',
  							'id': idx === 0 && typeof button === 'string' ?
  								settings.sTableId +'_'+ button :
  								null
  						} ).html( btnDisplay ).appendTo( container );

  					settings.oApi._fnBindAction(
  						node, {action: button}, clickHandler
  					);

  					counter++;
  				}
  			}
  		}
  	};



  	// IE9 throws an 'unknown error' if document.activeElement is used
  	// inside an iframe or frame.
  	var activeEl;

  	try {
  		// Because this approach is destroying and recreating the paging
  		// elements, focus is lost on the select button which is bad for
  		// accessibility. So we want to restore focus once the draw has
  		// completed
  		activeEl = $(host).find(document.activeElement).data('dt-idx');
  	}
  	catch (e) {}

  	attach(
  		$(host).empty().html('<div class="ui stackable small pagination menu"/>').children('div'),
  		buttons
  	);

  	if ( activeEl ) {
  		$(host).find( '[data-dt-idx='+activeEl+']' ).focus();
  	}
  };

  return DataTable;

}));
