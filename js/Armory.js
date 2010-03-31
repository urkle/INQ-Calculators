/* Armor Points Class */
(function($) { //hide namespace

function lookup(aTable, aKey, aDefault) {
    return aTable[aKey] || aDefault;
}
function verifyLookup(aTable, aKey, aDefault) {
    return aTable.indexOf(aKey)!=-1 ? aKey : aDefault;
}
function percentage2bonus(aP) {
    return 1 + (aP / 100);
}
/* Various Lookups */
var l_resistanceTypes = ['Slashing','Piercing','Blunt','Fire','Ice','Lightning'];
var l_resistanceQualityFactors = {'Very Bad':0.7,'Bad':0.85,'Normal':1,
    'Good':1.15,'Very Good':1.3,'Excellent':1.45};
var l_resistanceQuality = Object.keys(l_resistanceQualityFactors);
var l_classTypeMasks = {
        'Archer':0x10,
        'Hunter':0x11,
        'Marksman':0x12,
        'Mage':0x20,
        'Conjurer':0x21,
        'Warlock':0x22,
        'Warrior':0x40,
        'Barbarian':0x41,
        'Knight':0x42
}
var l_classTypes = Object.keys(l_classTypeMasks);
var l_classEquipTypes = {
        0x10: ['Head','Chest','Arms','Hands','Legs'],
        0x20: ['Head','Tunic','Hands'],
        0x40: ['Head','Chest','Arms','Hands','Legs','Shield']
};
var l_classMask = 0xF0;

var l_equipTypeFactors = {'Head':0.775,'Chest':0.875,'Tunic':1.1,'Arms':0.575,
    'Hands':0.675,'Legs':0.475,'Shield':0.8};
var l_equipTypes = Object.keys(l_equipTypeFactors);

var l_spellBonusFactors = {
    'Evasive Tactics':[15,25,35,45,55],
    'Force Armor':[30,40,50,60,70],
    'Caution':[20,30,40,50,60],
    'Fiendly Shielding':[10,15,20,25,30],
    'Heroic Presence':[60,70,80,90,100]
};
var l_classSpells = {
    0x13: ['Evasive Tactics'],
    0x21: ['Force Armor'],
    0x33: ['Caution']
}

function Armor(aName, aClassType, aType, aPoints, aResistances)
{
    this.name = aName;
    this.reqclass = verifyLookup(l_classTypes, aClassType);
    this.type = verifyLookup(l_equipTypes, aType);
    var base = l_classTypeMasks[this.reqclass] & l_classMask;
    if (l_classEquipTypes[base].indexOf(this.type) == -1) {
        throw TypeError("Class "+this.reqclass+" can not carry "+this.type+".");
    }
    this.points = aPoints || 0;
    this.resist = {};
    if (typeof aResistances == 'object') {
        for (var i=0,l=l_resistanceTypes.length; i<l; ++i) {
            var k = l_resistanceTypes[i];
            if (k in aResistances) {
                this.resist[k] = verifyLookup(l_resistanceQuality, aResistances[k], 'Normal');
            }
        }
    }
}

$.extend(Armor.prototype, {
    armorMultiplierForResistance: function(resist) {
        return lookup(l_resistanceQualityFactors, resist, 1)
                * lookup(l_equipTypeFactors, this.type, 0);
    },
    armorPoints: function(spell1, spell2, itembonus) {
        var bonus = percentage2bonus(spell1 || 0)
                    * percentage2bonus(spell2 || 0)
                    * percentage2bonus(itembonus || 0);
        var ret = {
            Normal: this.points * this.armorMultiplierForResistance('Normal') * bonus
        };
        for (var i=0,l=l_resistanceTypes.length; i<l; ++i) {
            var restype = l_resistanceTypes[i];
            ret[restype] = this.points * this.armorMultiplierForResistance(restype) * bonus;
        }
        return ret;
    }
});

Armor.Qualities = function() {
    return l_resistanceQuality;
};
Armor.TypesForClass = function(aClass) {
    return l_classEquipTypes[lookup(l_classTypeMasks,aClass) & l_classMask];
};

window.cArmor = Armor;

function Armory()
{
    this.armor = [];
}

$.extend(Armory.prototype, {
    addArmor: function(aArmor) {
        if (aArmor instanceof Armor) {
            this.armor.push(aArmor);
            return this;
        } else {
            throw new TypeError('Expecting an Armor object');
        }
    },
    listArmor: function() {
        return this.armor;
    }
});

window.cArmory = Armory;

function Character(aName, aClassType)
{
    this.char_class = verifyLookup(l_classTypes, aClassType);
    this.name = aName;
    this.armor = {};
}

$.extend(Character.prototype, {
    toString: function() {
        return this.name + " the "+this.char_class;
    },
    addArmor: function(aArmor) {
        if (aArmor instanceof Armor) {
            var myC = l_classTypeMasks[this.char_class];
            var aC = l_classTypeMasks[aArmor.reqclass];
            if ((aC & myC) == aC) {
                this.armor[aArmor.type] = aArmor;
            }
        } else {
            throw new TypeError('Expecting an Armor object');
        }
        return this;
    }
});

window.cCharacter = Character;

})(jQuery);
