/*
 * inqtools-map.js
 *
 * Copyright (c) 2011 Edward Rudd <urkle at outoforder.cc>
 *
 * This file is part of INQ-Calculators.
 *
 * INQ-Calculators is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * INQ-Calculators is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with INQ-Calculators.  If not, see <http://www.gnu.org/licenses/>.
 */
$(function() {
        /** Interactive Map */
    $('#RO_InteractiveMap').interactiveMap({
        map: 'images/map/map.xml'
    }).qtip({
        prerender: true,
        content: {title:'Map Info',text:'Info'},
        position: {
            my: 'bottom right',
            at: 'top left',
            target: false
        },
        show: false,
        hide: {
            event:false,
            effect: false // So hiding works reliably below
        }
    }).delegate('.overlay .zone','hover',function(e) {
        var o = $('#RO_InteractiveMap').interactiveMap('overlay');
        if (e.type == 'mouseenter') {
            o.svgChange(this,{stroke:'#FFFFFF'});
            var zID = $(this).attr('id').replace(/^.+?(\d+)$/,'$1');
            var zInfo = ROMapData.zoneInfo(zID);
            $('#RO_InteractiveMap')
                .qtip('option','position.target',false)
                .qtip('option','content.text',zInfo.text || 'Unknown')
                .qtip('option','content.title.text',zInfo.title)
                .qtip('option','position.target',$(this))
                .qtip('show');
        } else {
            o.svgChange(this,{stroke:null});
            $('#RO_InteractiveMap').qtip('hide');
        }
    }).delegate('.overlay .npc','hover',function(e) {
        if (e.type == 'mouseenter') {
            $(this).css('stroke','#ffffff');
            var nID = $(this).attr('id').replace(/^.+?(\d+)$/,'$1');
            var nInfo = ROMapData.npcInfo(nID);
            $('#RO_InteractiveMap')
                .qtip('option','position.target',false)
                .qtip('option','content.text',nInfo.text || 'Unknown')
                .qtip('option','content.title.text',nInfo.title)
                .qtip('option','position.target',$(this))
                .qtip('show');
        } else {
            $(this).css('stroke','#000000');
            $('#RO_InteractiveMap').qtip('hide');
        }
    }).delegate('.overlay .npc, .overlay .zone','click',function(e) {
        var t = $(this);
        var ID = t.attr('id').match(/^.+?_(\w+)_(\d+)$/);
        if (ID[1] == 'zone') {
            ROMapData.highlightZone(ID[2]);
        } else {
            ROMapData.highlightNPC(ID[2]);
        }
    });


    $('div.results').delegate('.search_result_row .throwOnMap','hover',function(e) {
        if (e.type == 'mouseenter') {
            $(this).closest('div.results')
                .qtip('option','content.text','Click to add result to Map')
                .qtip('option','position.target',$(this))
                .qtip('show');
        } else {
            $(this).closest('div.results').qtip('hide');
        }
    }).delegate('.search_result_row .throwOnMap','click',function(e) {
        ROMapData.add($(this).data('map'));
        var o = $('#mapTab');
        if ( $(window).scrollTop() > o.offset().top) {
            var p = $('#mapTabClone');
            if (!p.length) {
                p = $('<div/>')
                    .hide()
                    .attr('id','mapTabClone')
                    .css({
                        position:'absolute'
                    })
                    .cssCopy(o,['backgroundImage','backgroundColor','width','height',
                        'lineHeight','color',
                        'fontSize','fontStyle','fontWeight','fontFamily']);
                var c = $('#mapTab > a');
                p.append($('<span/>')
                    .text(c.text())
                    .cssCopy(c, [
                        'paddingLeft','paddingTop','paddingRight','paddingBottom',
                        'color','display'
                    ]));
                $(document.body).append(p);
            }
            if (p.is(':visible')) {
                p.data('item',$(this));
                throwMapStart.call(p);
            } else {
                p.css(o.offset())
                    .show()
                    .data('item',$(this))
                    .animate({top:$(window).scrollTop()},'fast',throwMapStart);
            }
        } else {
            $(this).effect('transfer',{to:'#mapTab',className:'ui-effects-transfer ui-widget-overlay ui-corner-all'},750);
        }
        e.stopPropagation();
    });

    window.ROMapData = new cROMapData('#RO_InteractiveMap', '#RO_MapItems', 'images/map/zones/overlay.json');

    $(window).resize(function() {
        refreshMaps();
    });
});

(function($) {
    function cROMapData(map, list, zoneURL) {
        this._map = $(map);
        this._overlay = this._map.interactiveMap('overlay');
        this._list = $(list);
        this._list.empty().append('<li class="help">Click the <span class="ui-icon ui-icon-star ui-icon-inline"/>'
                    +' icon in search results to visualize them on this map.'
                    +' <span class="removeAll">[Clear All]</span></li>');
        this._list.find('.removeAll').click($.proxy(this._evtListClear, this));
        this._list.delegate('li div.remove','click',$.proxy(this._evtListClose, this));
        this._list.delegate('li.zone,li.npc','click',$.proxy(this._evtListClick, this));
        this._zoneURL = zoneURL;
        this._npc = {width:75,height:150};
        this._loading = false;
        this.clear();
    }

    $.extend(cROMapData.prototype,{
        load:function() {
            if (!this._zones && !this._loading) {
                this._loading = true;
                $.getJSON(this._zoneURL,$.proxy(this._loadCB,this));
            }
        },
        _loadCB: function(json) {
            this._zones = json;
            var k = Object.keys(this._data.zones);
            if (k.length) {
                this.addZones(k);
            }
        },
        _evtListClick: function(e) {
            if ($(e.target).hasClass('remove')) return;
            var t = $(e.currentTarget);
            if (t.hasClass('zone')) {
                var zID = t.attr('zone');
                var z = this.zoneOffset(zID);
                if (z) {
                    this._map.interactiveMap('center',z.left, z.top, true);
                }
            } else {
                var npcID = t.attr('npc');
                var n = this._data.npcs[npcID];
                if (n) {
                    this._map.interactiveMap('center',n.position.x, n.position.z, true);
                }
            }
        },
        _evtListClose: function(e) {
            var t = $(e.currentTarget).closest('li');
            if (t.hasClass('zone')) {
                this.removeZone(t.attr('zone'));
            } else {
                this.removeNPC(t.attr('npc'));
            }
            e.stopPropagation();
        },
        _evtListClear: function(e) {
            this.clear();
        },
        zoneSVG:function(zoneID) {
            if (zoneID in this._zones) {
                return this._zones[zoneID].svg;
            }
            return null;
        },
        zoneOffset:function(zoneID) {
            if (zoneID in this._zones) {
                return {left:this._zones[zoneID].left, top: this._zones[zoneID].top};
            }
            return null;
        },
        npcInfo:function(npcID) {
            var n = this._data.npcs[npcID];
            if (!n) return {title:'Unknown NPC',text:''};
            var ret = {title:n.name};
            ret.text = '<dl><dt>Profession</dt><dd>'+n.profession+'</dd>';
            ret.text += '<dt>Position</dt><dd>'+n.position.x+', '+n.position.z+'</dd>';
            ret.text += '</dl>';
            return ret;
        },
        zoneInfo:function(zoneID) {
            var z = this._data.zones[zoneID];
            if (!z) return {title:'Unknown Zone',text:''};
            var ret = {title:z.name};
            ret.text = '<dl><dt>Realm</dt><dd>'+z.realm+'</dd>';
            if (z.mobs) {
                ret.text+='<dt>Mobs</dt><dd>'+z.mobs.join(', ')+'</dd>';
            }
            ret.text += '</dl>';
            return ret;
        },
        highlightZone:function(zoneID) {
            var o = this._list.find('li[zone="'+zoneID+'"]');
            if (o.length) {
                o[0].scrollIntoView(true);
                o.effect('highlight',{color:'#EFC325'},300);
            }
        },
        highlightNPC:function(npcID) {
            var o = this._list.find('li[npc="'+npcID+'"]');
            if (o.length) {
                o[0].scrollIntoView(true);
                o.effect('highlight',{color:'#EFC325'},300);
            }
        },
        clear: function() {
            this._data = {zones:{},npcs:{}};
            this._overlay.clear();
            this._overlay.addSymbol('romap_npc',function(svg, parent, color) {
                var s = svg.symbol(parent, 'temp',0,0,100,200,{'class':'item'});
                svg.circle(s,50,20,20);
                svg.path(s,'m 79.787032,45.908714 c 0,0 8.54,-1.064'
                    +' 8.54,8.542 0,9.606 0,58.719996 0,58.719996 0,0'
                    +' 2.141,8.008 -6.937,8.008 h -5.876 v 78.107'
                    +' h -51.248 v -77.037 h -6.406 c 0,0 -6.407,2.14'
                    +' -6.407,-6.406 V 54.450714 c 0,0 0,-8.809 8.81,-8.809'
                    +' l 59.524,0.267 z');
                return s;
            });
            this._list.find('li:gt(0)').remove();
        },
        add:function(data) {
            var add = {zones:[],npcs:[]};
            for (var type in data) {
                for (var o in data[type]) {
                    if (o in this._data[type]) {
                        switch (type) {
                            case 'zones':
                                // Merge any mob data
                                if (data[type][o].mobs) {
                                    this._data[type][o].mobs =
                                        (this._data[type][o].mobs || []).concatUnique(data[type][o].mobs);
                                }
                                break;
                            case 'npcs':
                            default:
                                // data is just duplicate no merging needed
                        }
                    } else {
                        this._data[type][o] = $.extend(true,{},data[type][o]);
                        add[type].push(o);
                    }
                }
            }
            this.addZones(add.zones);
            this.addNPCs(add.npcs);
        },
        removeZone: function(zoneID) {
            if (zoneID in this._data.zones) {
                delete this._data.zones[zoneID];
            }
            this._overlay.removeObject('romap_zone_'+zoneID);
            this._list.find('li.zone[zone="'+zoneID+'"]').remove();
        },
        removeNPC: function(npcID) {
            if (npcID in this._data.npcs) {
                delete this._data.npcs[npcID];
            }
            this._overlay.removeObject('romap_npc_'+npcID);
            this._list.find('li.npc[npc="'+npcID+'"]').remove();
        },
        addZones: function(zones) {
            if (!this._zones) {
                this.load();
                return;
            }
            // iterate through newly added entities
            for (var i=0; i< zones.length; ++i) {
                this._list
                    .append($('<li class="zone"/>')
                        .attr('zone',zones[i])
                        .text(this._data.zones[zones[i]].name)
                        .append('<div class="remove"><span class="ui-icon ui-icon-closethick"/></div>'));
                var d = this.zoneSVG(zones[i]);
                if (d) {
                    this._overlay.addPath('romap_zone_'+zones[i],d,{'class':'zone'});
                }
            }
        },
        addNPCs: function(npcs) {
            for (var i=0; i< npcs.length; ++i) {
                var d = this._data.npcs[npcs[i]];
                this._list
                    .append($('<li class="npc"/>')
                        .attr('npc',npcs[i])
                        .text(d.name)
                        .append('<div class="remove"><span class="ui-icon ui-icon-closethick"/></div>'));
                this._overlay.addReference('romap_npc_'+npcs[i],'#romap_npc',{
                    x: d.position.x,
                    y: d.position.z,
                    width: this._npc.width,
                    height: this._npc.height,
                    fill:(d.realm == 'Syrtis' ? '#00ff00' : (d.realm == 'Ignis' ? '#ff0000' : '#0000ff')),
                    'class':'npc'
                });
            }
        }
    });
    window.cROMapData = cROMapData;
})(jQuery);

function throwMapStart() {
    var o = $('#mapTabClone');
    var c = o.data('count') || 0;
    ++c;
    o.data('count',c);
    o.data('item').effect('transfer',{to:'#mapTabClone',
                    className:'ui-effects-transfer ui-widget-overlay ui-corner-all'}
                    ,750,throwMapComplete);
}

function throwMapComplete() {
    var o = $('#mapTabClone');
    var c = o.data('count');
    --c;
    o.data('count',c);
    if (c==0) {
        o.animate({top:$('#mapTab').offset().top}).hide('fast');
    }
}

function refreshMaps(animate) {
    if (animate) {
        $('#RO_MapWrapper')
            .animate({
                height:$(window).height()-
                        ( $('#RO_MapWrapper').offset().top + $('#footer').height() ) - 5
                },200,function() {
                $('#RO_InteractiveMap').interactiveMap('render');
            });
    } else {
        $('#RO_MapWrapper').height($(window).height()-
                        ( $('#RO_MapWrapper').offset().top + $('#footer').height() ) - 5);
        $('#RO_InteractiveMap').interactiveMap('render');
    }
}