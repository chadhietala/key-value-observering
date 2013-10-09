/**
 * KVO allows you to do Key Value Observing. The concept is that that you
 * `bindTo` a property in another object when the property changes the `changed()`
 * method will be called. It's also important to note that the Object that binds to
 * to the other becomes a one way proxy for that object.
 *
 * @example
 *
 * var MyModel = Fiber.extend( function ( base ) {
 *   return {
 *     init : function () {
 *       this.name = 'Bob';
 *     }
 *   };
 * } );
 *
 * var MyController = Fiber.extend( function ( base ) {
 *   return {
 *     nameChanged: function () {
 *       // Will be called if the instance property does not exist or if it changes
 *       console.log( this.get( 'name' ) );
 *     }
 *   };
 * } );
 *
 * Fiber.mixin( MyModel, KVO );
 * Fiber.mixin( MyController, KVO );
 *
 * var myController = new MyController();
 * var myModel = new MyModel();
 *
 * myController.bindTo( 'name', myModel ); // Consoles Bob
 *
 * myModel.set( 'name', 'Bill' );  // Consoles Bill
 *
 * myController.set( 'name', 'Mark' ); // Consoles Mark
 *
 * myController.nameChanged = function () {
 *   console.log( 'nameChanged' );
 * }
 *
 */
var KVO = function ( ) {
  return {

    /**
     * Is the property bound as either an observer or target
     * @param  {String}  key the property to be set
     * @return {Boolean}
     */
    _isPropertyBound: function ( key ) {
        return this[ key ] !== null && typeof this[ key ] === 'object' && '__myIndex' in this[ key ];
    },

    /**
     * Recursively updates observer indexes when new objects are added to the shared object.
     * @param  {String} key            the property being bound
     * @param  {interger} offsetIncrease the length of the target's shared object array
     * @return {void}
     */
    _updateObserverIndexes: function ( key, offsetIncrease ) {

      // Updated the obersver index
      this[ key ].__myIndex += offsetIncrease;

      for ( var i in this[ key ].__observerIndexes ) {

        // Make sure the property hasn't been unbound
        if( this[ key ].__sharedObject.__observers[ this[ key ].__observerIndexes[ i ] ] !== null ) {

          // Recursivly update observers
          this[ key ].__sharedObject.__observers[ this[ key ].__observerIndexes[ i ] ].obj._updateObserverIndexes( this[ key ].__sharedObject.__observers[ this[ key ].__observerIndexes[ i ] ].key, offsetIncrease );
        }

        // Increase the offset to reflect the larger object
        this[ key ].__observerIndexes[ i ] += offsetIncrease;
      }
    },

    /**
     * Binds the property to a specific target.
     * @param  {String} key       the property to be bound
     * @param  {object} target    the object to bind to
     * @param  {String} targetKey optional name of the property on the target, if different from the name of the property on the observer
     * @param  {Boolean} noNotify  optional do not call Changed callback upon binding
     * @return {void}
     */
    bindTo: function ( key, target, targetKey, noNotify ) {
      var targetKey = targetKey || key,
          observersValue,
          targetObserversLength;

      // Make sure the target has the property
      if ( !( targetKey in target ) ) {
        throw('Undefined: property "' + targetKey + '" on target object.');
      }

      // Is the target's property already complex
      if(! target._isPropertyBound( targetKey ) ) {

        // Make the property complex
        target[ targetKey ] = {
          __myIndex: 0,
          __observerIndexes: [  ],
          __sharedObject: {
            __value: target[ targetKey ],
            __observers: [ {obj: target, key: targetKey} ]
          }
        };
      }

      // Capture the number of observers before binding
      targetObserversLength = target[ targetKey ].__sharedObject.__observers.length;

      // Add the new observer index to the targets array of observer indexes
      target[ targetKey ].__observerIndexes.push( targetObserversLength );

      // Is the observer being observered
      if ( this._isPropertyBound( key ) ) {

        // Make sure the key isn't already bound
        if ( this[ key ].__myIndex !== 0) {
          throw('"' + key + '" is already bound.');
        }

        // Update the observer's observers index to relfect merged observer array
        this._updateObserverIndexes( key, targetObserversLength );

        // Merge the observers
        target[ targetKey ].__sharedObject.__observers = target[ targetKey ].__sharedObject.__observers.concat(this[ key ].__sharedObject.__observers);

        // Store the value prior to binding
        observersValue = this[ key ].__sharedObject.__value;
      } else {
        // Observer was not complex, so make it complex
        observersValue = this[ key ];

        this[ key ] = {
          __myIndex: targetObserversLength,
          __observerIndexes: [  ],
          __sharedObject: null
        };

        // Add the observer to the target's array of observers
        target[ targetKey ].__sharedObject.__observers.push({
          obj: this,
          key: key
        });

      }

      for ( var i in target[ targetKey ].__sharedObject.__observers ) {

        // Check to see if it is a true observer and not unbound
        if(i < targetObserversLength || target[ targetKey ].__sharedObject.__observers[ i ] === null) {
          continue;
        }

        // Point all observers to the common shared object
        target[ targetKey ].__sharedObject.__observers[ i ].obj[ target[ targetKey ].__sharedObject.__observers[ i ].key ].__sharedObject = target[ targetKey ].__sharedObject;

        // Value has not changed or this is the first bind and noNotify was set
        if( target[ targetKey ].__sharedObject.__value === observersValue || ( i === targetObserversLength && noNotify ) ) {
          continue;
        }

        // Trigger the Changed method if there is one
        if( target[ targetKey ].__sharedObject.__observers[ i ].key + 'Changed' in target[ targetKey ].__sharedObject.__observers[ i ].obj) {

          target[ targetKey ].__sharedObject.__observers[ i ].obj[ target[ targetKey ].__sharedObject.__observers[ i ].key + 'Changed']();
        }
      }

    },

    /**
     * Returns the value of the property specified by 'key'
     * @param  {String} key the property to fetch
     * @return {mixed}     the value of the key
     */
    get: function ( key ) {
      // If the value is compelex return the value otherwise do a normal lookup
      return this._isPropertyBound( key ) ? this[ key ].__sharedObject.__value : this[ key ];
    },

    /**
     * Sets the value of a key
     * @param {String} key           the property you want to set
     * @param {String} value         the value you want to set on the property
     * @param {boolean} forceCallback optional call the callbacks, regardless of weather the value has changed or not
     * @returns {void}
     */
    set: function ( key, value, forceCallback ) {

      // Does the property exist on the object
      if( !(key in this) ) {
        throw('Cannot set value for undefined property "' + key + '".');
      }

      // Is this a bound property?
      if( this._isPropertyBound( key ) ) {
        // Has the property changed?
        if( this[ key ].__sharedObject.__value === value && !forceCallback ) {
          return;
        }

        // Set the new value
        this[ key ].__sharedObject.__value = value;

        // Call any callback's belonging to objects bound to this property
        for( var i in this[ key ].__sharedObject.__observers ) {

          // Make sure the observer has not been unbound and there is a callback defined.
          if( this[ key ].__sharedObject.__observers[ i ] === null || ! this[ key ].__sharedObject.__observers[ i ].obj[ this[ key ].__sharedObject.__observers[ i ].key + 'Changed' ] ) {
            continue;
          }

          this[ key ].__sharedObject.__observers[ i ].obj[ this[ key ].__sharedObject.__observers[ i ].key + 'Changed' ](value);

        }

        return;
      }

      // Has the property changed?
      if ( this[ key ] === value ) {
        return;
      }

      // Set the value
      this[ key ] = value;

      // Manually trigger the changed event
      if( key + 'Changed' in this ) {
        this[ key + 'Changed' ]();
      }
    }
  };
};