<?php
/*
 * This file is part of INQ Calculators.
 *
 * INQ Calculators is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * INQ Calculators is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with INQ Calculators.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @copyright Copyright 2010-2011
 * @author Edward Rudd <urkle at outoforder.cc>
 */
abstract class AjaxRequest {
    public $cache = true;

    abstract public function request($path_args);

    public static function genkey()
    {
        $key = '';
        $prevkey = array();
        $k = array_keys($_GET);
        sort($k);
        foreach ($k as $_k) {
            for ($keylen = 1, $_t = substr($_k, 0, $keylen); in_array($_t,$prevkey); ++$keylen) {
                $_t = substr($_k, 0, $keylen);
            }
            $prevkey[] = $_t;
            $key .= $_t.':'.$_GET[$_k].';';
        }
        return $key;
    }
}
?>
