var Aggregate, debug;

Aggregate = require('./query');

debug = require('debug')('loopback:mixins:aggregate');

function _findObjects(obj, targetProp, finalResults) {

  function getObject(theObject) {
    let result = null;
    if (theObject instanceof Array) {
      for (let i = 0; i < theObject.length; i++) {
        getObject(theObject[i]);
      }
    } else {
      for (let prop in theObject) {
        if (theObject.hasOwnProperty(prop)) {
          console.log(prop + ': ' + theObject[prop]);
          if (prop === targetProp) {
            console.log('--found id');
              finalResults.push(theObject);
          }
          if (theObject[prop] instanceof Object || theObject[prop] instanceof Array) {
            getObject(theObject[prop]);
          }
        }
      }
    }
  }
  getObject(obj);

};

module.exports = function(Model) {
  var rewriteId;
  rewriteId = function(doc) {
    if (doc == null) {
      doc = {};
    }
    if (doc._id) {
      doc.id = doc._id;
    }
    delete doc._id;
    return doc;
  };
  Model.aggregate = function(filter, options, callback) {
    var aggregate, collection, connector, cursor, model, result, subtracts, where;
    connector = this.getConnector();
    model = Model.modelName;
    debug('aggregate', model);
    if (!filter.aggregate) {
      return callback(new Error('no aggregate filter'));
    }
    subtracts = new Array;
    result = _findObjects(filter.aggregate, '$subtract', subtracts);
    subtracts.forEach(function(value) {
      var error;
      try {
        return value.$subtract[0] = new Date(value.$subtract[0]);
      } catch (error1) {
        error = error1;
      }
    });
    aggregate = new Aggregate(filter.aggregate);
    if (filter.where) {
      where = Model._coerce(filter.where);
      where = connector.buildWhere(model, filter.where);
      aggregate.pipeline.unshift({
        '$match': where
      });
    }
    debug('all.aggregate', aggregate.pipeline);
    if (filter.fields) {
      aggregate.project(filter.fields);
    }
    if (filter.sort) {
      aggregate.sort(connector.buildSort(filter.sort));
    }
    collection = connector.collection(model);
    cursor = aggregate.exec(collection);
    if (filter.limit) {
      cursor.limit(filter.limit);
    }
    if (filter.skip) {
      cursor.skip(filter.skip);
    } else if (filter.offset) {
      cursor.skip(filter.offset);
    }
    return cursor.toArray(function(err, data) {
      debug('aggregate', model, filter, err, data);
      return callback(err, data.map(rewriteId));
    });
  };
  Model.remoteMethod('aggregate', {
    accepts: [
      {
        arg: "filter",
        description: "Filter defining fields, where, aggregate, order, offset, and limit",
        type: "object"
      }, {
        arg: "options",
        description: "options",
        type: "object"
      }
    ],
    accessType: "READ",
    description: "Find all instances of the model matched by filter from the data source.",
    http: {
      path: "/aggregate",
      verb: "get"
    },
    returns: {
      arg: "data",
      root: true,
      type: 'array'
    }
  });
};
