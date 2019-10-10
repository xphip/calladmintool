// ==UserScript==
// @name         Calladmin Lite Tool
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Script para auxilio da ferramenta CalladminTool
// @author       calladmintool
// @match        *://calladmin-middleware.denerdtv.com/*
// @grant        none
// ==/UserScript==

(function() {
	'use strict';

	/**************
	 * Inject CSS *
	 **************/
	const CSSStyle = document.createElement('style');
	CSSStyle.innerHTML = `
		code.server-ip:after {
			position: absolute;
			content: attr(title) " ";
			height: auto;
			width: 10px;
			margin-left: 10px;
			word-break: keep-all;
			line-height: 2;
			color: #999;
		}
	`;
	document.head.appendChild(CSSStyle);

	window.onload = function() {

		/**********************
		 * Check dependencies *
		 **********************/
		if (typeof jQuery == 'undefined') {
			console.error('This app requeires jQuery. Aborting.');
			return false;
		}

		/*******************
		 * Inject elements *
		 *******************/

		// Preset elements
		const _base = $('body > main > div.row.border').find('div:eq(0) > div:eq(1) > div:eq(0)'),
			$downloadDiv = _base.find('> div:eq(1) > div.btn-group'),
			$steamTags = _base.find('pre'),
			$serverTags = _base.find('code:eq(1)'),
			$reportsID =  _base.find('> div:eq(1) > p > a');

		// Report ID
		if ($reportsID.length > 0) {
			$reportsID.each(async (i, v) => {
				const regID = /([0-9]*)\/?$/g,
					reportID = regID.exec( $(v).attr('href'))[1],
					$reportIDCopy = RES.$btn_eLinkCopy({href: `javascript:CopyText('`+reportID+`');`});

				$reportIDCopy.insertAfter( $(v) )
			});
		}

		// ServerTag
		if ($serverTags.length > 0) {
			$serverTags.each(async (i, server) => {
				$(server).addClass('server-ip');
				$(server).attr(
					'title',
					( typeof SERVERS_LIST[$(server).text()] != 'undefined' )? SERVERS_LIST[$(server).text()] : '',
				);
			});
		}

		//ServerSteam
		if ($steamTags.length > 0) {
			$steamTags.each(async (i, steam) => {

				let base_url = `https://steamid.io/lookup/${$(steam).text()}`,
					$copy = RES.$btn_eLinkCopy({href: `javascript:CopyText('`+$(steam).text()+`');`}),
					$link = RES.$btn_eLink({href: base_url, title: base_url, target: '_blank'});

				$(steam).append($copy).append($link);

			});
		}

		// Download button
		if ($downloadDiv.length > 0) {

			$downloadDiv.each(async (i, downloadBtn) => {
				const $btnGroup = EL.btn.Download.factory(),
					$btn = $btnGroup.find('a'),
					$demoLinkBtn = $(downloadBtn).find('a:first-child'),
					demoLink = $demoLinkBtn.attr('href');

				$btnGroup.insertAfter($demoLinkBtn);

				//
				const demoReady = (fire) => {
					const r = $demoLinkBtn.attr('href').split(/([A-Za-z0-9\_\-\.]+)\.dem$/g)[1];
					$btn.off().on('click', (fire) => {
						CopyText('playdemo ' + r);
						if (typeof fire != 'undefined' && fire) {
							EL.btn.Download.toggleState($btn, 5);
							setTimeout(() => EL.btn.Download.toggleState($btn, 4), 1500);
						} else {
							EL.btn.Download.toggleState($btn, 4);
						}
					});
					EL.btn.Download.toggleState($btn, 4);
				};

				// Check if has downloaded
				Request.Do('check', demoLink, (data) => {
					if (data.Status == 'success') {
						demoReady();
						// EL.btn.Download.toggleState($btn, 3);
					} else {
						EL.btn.Download.toggleState($btn, 1);
					}
				}).then(resp => {})
				.catch(err => {
					EL.btn.Download.toggleState($btn, 1);
					// EL.btn.Download.toggleState($btn, 6);
					$demoLinkBtn.attr('title', 'Erro inesperado ao tentar verificar!');
				});

				// Add event
				$btn.on('click', (e) => {

					EL.btn.Download.toggleState($btn, 2);
					Request.Do('download', demoLink, (data) => {
						if (data.Status == "finished") {
							demoReady(true);
						} else {
							EL.btn.Download.toggleState($btn, 6);
							$demoLinkBtn.attr('title', data.Text);
							console.error(data.Text);
						}
					}).then(resp => {})
					.catch(err => {
						EL.btn.Download.toggleState($btn, 6);
						$demoLinkBtn.attr('title', data.Text);
					});
				});
			});

		}

	}
})();

const $query = (element) => Array.from(document.querySelectorAll(element));

const SERVERS_LIST = {
	"177.54.150.15:27001": 'DMFFA_MIRAGE',
	"177.54.150.15:27002": 'DMFFA_MIRAGE_P',
	"177.54.150.15:27003": 'COMP_5V5',
	"177.54.150.15:27004": 'ARENA_1V1',
	"177.54.150.15:27005": 'RTK',
	"177.54.150.15:27006": 'RTK_MISTO',
	"177.54.150.15:27007": 'SURF_CLASSIC',
	"177.54.150.15:27008": 'CTF',
	"177.54.150.15:27009": 'COMP_5V5',
	"177.54.150.15:27010": 'KZ',
};

window.CopyText = function(text) {
	navigator.clipboard.writeText( text ).then(function() {
		console.log('Async: Copying to clipboard was successful!');
	}, function(err) {
		console.error('Async: Could not copy text: ', err);
	});
}

const Request = {
	url: 'ws://localhost:8081/ws',

	Do: async function(command, text, onmessage) {

		let socket = new WebSocket(this.url);

		socket.onopen = (s) => {
			s.currentTarget.send(JSON.stringify({
				"command": command,
				"text": text
			}));
		};

		if (typeof onmessage == 'function')
			socket.onmessage = (msg) => {
				onmessage(JSON.parse(msg.data), msg);
			}

		return new Promise((resolve, reject) => {

			socket.onclose = (arg) => {
				resolve(arg);
			};

			socket.onerror = (err) => {
				reject(err);
			};

		});
	},
};

const EL = {
	btn: {
		Download: {
			class: '',
			states: {
				1: 'download',
				2: 'spinner',
				3: 'ready',
				4: 'copy',
				5: 'check',
				6: 'error',
			},
			factory: function() {
				return RES.$btn_Group().append(RES.$btn_Download()
					.append(RES.$spinner().append(RES.$icon_Spinner())));
			},
			toggleState: function(el, state) {
				if (typeof state == 'undefined' || typeof this.states[state] == 'undefined')
					return false;

				let $el = null;
				if (el instanceof jQuery) {
					$el = el;
				} else {
					$el = $(el);
				}

				if (state == 1) {
					$el.attr('class', '').addClass('btn btn-primary');
					$el.prop('disabled', false).removeClass('disabled');
					$el.html('').append(RES.$icon_Download());

					$el.attr('title', 'Demo pronta para baixar!');
				} else if (state == 2) {
					$el.attr('class', '').addClass('btn btn-primary');
					$el.prop('disabled', true).addClass('disabled');
					$el.html('').append(RES.$spinner().append(RES.$icon_Spinner()));

					$el.attr('title', 'Aguardando resposta do servidor!');
				} else if (state == 3) {
					$el.attr('class', '').addClass('btn btn-primary');
					$el.prop('disabled', false).removeClass('disabled');
					$el.html('').append(RES.$icon_Play());

					$el.attr('title', 'Demo pronta para Overwatch!');
				} else if (state == 4) {
					$el.attr('class', '').addClass('btn btn-primary');
					$el.prop('disabled', false).toggleClass('disabled', false);
					$el.html('').append(RES.$icon_Copy());

					$el.attr('title', 'Demo pronta para Overwatch!');
				} else if (state == 5) {
					$el.attr('class', '').addClass('btn btn-success');
					$el.prop('disabled', true).toggleClass('disabled', true);
					$el.html('').append(RES.$icon_Check());

					$el.attr('title', 'Falha ao processar a demo!');
				} else if (state == 6) {
					$el.attr('class', '').addClass('btn btn-danger');
					$el.prop('disabled', true).toggleClass('disabled', true);
					$el.html('').append(RES.$icon_Error());

					$el.attr('title', 'Falha ao processar a demo!');
				}

				return true;
			}
		}
	}
};

const RES = {
	// Icons
	$icon: (data) => {
		return $('<i/>', $.extend({}, data) ); },
	$icon_Download: (data) => {
		return RES.$icon($.extend({class: 'fas fa-cloud-download-alt'}, data)); },
	$icon_Spinner: (data) => {
		return RES.$icon($.extend({class: 'sr-only'}, data)); },
	$icon_Play: (data) => {
		return RES.$icon($.extend({class: 'fa fa-play'}, data)); },
	$icon_Copy: (data) => {
		return RES.$icon($.extend({class: 'fas fa-copy'}, data)); },
	$icon_Check: (data) => {
		return RES.$icon($.extend({class: 'fa fa-check'}, data)); },
	$icon_Error: (data) => {
		return RES.$icon($.extend({class: 'fa fa-exclamation-triangle'}, data)); },
	$icon_eLink: (data) => {
		return RES.$icon($.extend({class: 'fas fa-external-link-alt ml-1'}, data)); },

	// El
	$el_P: (data) => {
		return $('<p/>', $.extend({}, data)) },
	$el_A: (data) => {
		return $('<a/>', $.extend({id: '', class: '', href: ''}, data)) },
	$el_Button: (data) => {
		return $('<button/>', $.extend({type: 'button', class: 'btn btn-primary'}, data)); },
	$el_Div: (data) => {
		return $('<div/>', $.extend({id: '', class: ''}, data)) },
	$el_Span: (data) => {
		return $('<span/>', $.extend({id: '', class: ''}, data)) },

	// Buttons
	$btn_Download: () => {
		return $('<a/>', {class: 'btn btn-primary CAT-btn-download disabled', style: 'width:46px;', href: 'javascript:;'}); },
	$btn_Dropdown: () => {
		return $('<button/>', {
			type: 'button',
			class: 'btn btn-danger dropdown-toggle dropdown-toggle-split',
			'data-toggle': 'dropdown',
			'aria-haspopup': 'true',
			'aria-expanded': 'false'
		}); },
	$btn_eLink: (data) => {
		return RES.$el_A(data).append(RES.$icon_eLink());},
	$btn_eLinkCopy: (data) => {
		return RES.$el_A(data).append(RES.$icon_Copy({class: 'fa fa-copy ml-2'}));},

	// Generic
	$spinner: () => {
		return $('<div/>', {class: 'spinner-border spinner-border-sm', role: 'status', style: 'font-size: 8px;'}); },
	$btn_Group: () => {
		return $('<div/>', {class: 'btn-group noselect', role: 'group'}); },
};