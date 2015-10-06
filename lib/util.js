window.UTIL = {

  /**
   * Class to hold coordinates of a three dimensional point.
   */
  vertex: function(x, y, z) {
    this.coordinates = [x, y, z];

    this.set = function(pos, value) {
      this.coordinates[pos] = value;
    }
  },

  /**
   * Class to hold collection of vertices which are connected to make a single
   * face.
   */
  face: function(zero, one, two, three) {
    this.vertices = [zero, one, two, three];

    this.set = function(pos, value) {
      this.vertices[pos] = value;
    }

    this.getVertex = function(pos) {
      return this.vertices[pos];
    }

    this.length = function() {
      return this.vertices.length
    }
  },

  geometry: function() {
    this.meshM = 10;
    this.meshN = 10;
    this.vertices = [];
    this.faces = [];
    this.matrix = mat4.create();
    this.globMatrix = mat4.create();
    this.children = [];
    this.t = mat4.create();

    this.transformByParent = function(parent) {
      mat4.copy(this.globMatrix, parent.globMatrix);
      mat4.multiply(this.globMatrix, this.globMatrix, this.matrix);
    }

    this.cube = function() {
      this.vertices = [
        new UTIL.vertex(-1, -1, 1), new UTIL.vertex(1, -1, 1), new UTIL.vertex(1, 1, 1), new UTIL.vertex(-1, 1, 1),
        new UTIL.vertex(-1, 1, -1), new UTIL.vertex(1, 1, -1), new UTIL.vertex(1, -1, -1), new UTIL.vertex(-1, -1, -1),
        new UTIL.vertex(-1, 1, 1), new UTIL.vertex(1, 1, 1), new UTIL.vertex(1, 1, -1), new UTIL.vertex(-1, 1, -1),
        new UTIL.vertex(-1, -1, 1), new UTIL.vertex(-1, -1, -1), new UTIL.vertex(1, -1, -1), new UTIL.vertex(1, -1, 1),
        new UTIL.vertex(1, -1, 1), new UTIL.vertex(1, -1, -1), new UTIL.vertex(1, 1, -1), new UTIL.vertex(1, 1, 1),
        new UTIL.vertex(-1, -1, -1), new UTIL.vertex(-1, -1, 1), new UTIL.vertex(-1, 1, 1), new UTIL.vertex(-1, 1, -1),
      ];

      this.faces = [
        new UTIL.face(0, 1, 2, 3),
        new UTIL.face(4, 5, 6, 7),
        new UTIL.face(8, 9, 10, 11),
        new UTIL.face(12, 13, 14, 15),
        new UTIL.face(16, 17, 18, 19),
        new UTIL.face(20, 21, 22, 23),
      ];

      return this;
    }

    this.sphere = function() {
      this.vertices = new Array((this.meshM + 1) * (this.meshN + 1));
      this.faces = new Array(this.meshM * this.meshN);
      this.meshToFaces();

      for (var m = 0; m <= this.meshM + 1; m++) {
        var u = m / this.meshM;
        for (var n = 0; n <= this.meshN + 1; n++) {
          var v = n / this.meshN;

          var x = Math.cos(2 * Math.PI * u) * Math.cos(Math.PI * (v - 0.5));
          var y = Math.sin(2 * Math.PI * u) * Math.cos(Math.PI * (v - 0.5));
          var z = Math.sin(Math.PI * (v - 0.5));

          this.vertices[this.pointToVertex(m, n)] = new UTIL.vertex(x, y, z);
        }
      }

      return this;
    }

    this.torus = function(bigR, littleR) {
      this.vertices = new Array((this.meshM + 1) * (this.meshN + 1));
      this.faces = new Array(this.meshM * this.meshN);
      this.meshToFaces();

      for (var m = 0; m <= this.meshM + 1; m++) {
        var u = m / this.meshM;
        for (var n = 0; n <= this.meshN + 1; n++) {
          var v = n / this.meshN;

          var x = Math.cos(2 * Math.PI * u) * (bigR + littleR * Math.cos(2 * Math.PI * v));
          var y = Math.sin(2 * Math.PI * u) * (bigR + littleR * Math.cos(2 * Math.PI * v));
          var z = littleR * Math.sin(2 * Math.PI * v);

          this.vertices[this.pointToVertex(m, n)] = new UTIL.vertex(x, y, z);
        }
      }

      return this;
    }

    this.cylinder = function() {
      this.vertices = new Array((this.meshM + 1) * (this.meshN + 1));
      this.faces = new Array(this.meshM * this.meshN);
      this.meshToFaces();

      for (var m = 0; m <= this.meshM + 1; m++) {
        var u = m / this.meshM;
        for (var n = 0; n <= this.meshN + 1; n++) {
          var v = n / this.meshN;

          var x = Math.cos(2 * Math.PI * u) * this.r(v);
          var y = Math.sin(2 * Math.PI * u) * this.r(v);
          var z;

          if (v < 0.5)
            z = -1;
          else
            z = 1;

          this.vertices[this.pointToVertex(m, n)] = new UTIL.vertex(x, y, z);
        }
      }

      return this;
    }

    this.r = function(v) {
      if (v == 0 || v == 1)
        return 0;
      else
        return 1;
    }

    this.meshToFaces = function() {
      for (var m = 0; m <= this.meshM; m++) {
        for (var n = 0; n <= this.meshN; n++) {
          var currentFace = m + (this.meshM * n);
          this.face[currentFace] = new UTIL.face(
              this.pointToVertex(m, n),
              this.pointToVertex(m + 1, n),
              this.pointToVertex(m + 1, n + 1),
              this.pointToVertex(m, n + 1));
        }
      }
    }

    this.pointToVertex = function(m, n) {
      return m + ((this.meshM + 1) * n);
    }

    this.hasVertex = function() {
      return this.vertices.length > 0;
    }

    this.add = function(child) {
      this.children.push(child);
    }

    this.remove = function(child) {
      var index = this.children.indexOf(child);
      this.children = this.children.splice(index, 1);
    }

    this.translate = function(x, y, z) {
      mat4.identity(this.t);
      mat4.translate(this.t, this.t, [x, y, z]);
      mat4.multiply(this.matrix, this.matrix, this.t);
    }

    this.rotateX = function(a) {
      mat4.identity(this.t);
      mat4.rotateX(this.t, this.t, a);
      mat4.multiply(this.matrix, this.matrix, this.t);
    }

    this.rotateY = function(a) {
      mat4.identity(this.t);
      mat4.rotateY(this.t, this.t, a);
      mat4.multiply(this.matrix, this.matrix, this.t);
    }

    this.rotateZ = function(a) {
      mat4.identity(this.t);
      mat4.rotateZ(this.t, this.t, a);
      mat4.multiply(this.matrix, this.matrix, this.t);
    }

    this.scale = function(x, y, z) {
      mat4.identity(this.t);
      mat4.scale(this.t, this.t, [x, y, z]);
      mat4.multiply(this.matrix, this.matrix, this.t);
    }
  },

/* TODO: port this
class UTIL.geometry_2d
    constructor: () ->
        @vertices = new Array()
        @matrix = mat4.create()
        @glob_matrix = mat4.create()
        @children = new Array()
        @t = mat4.create()
        @rotate_vec = vec3.create()
        @translate_vec = vec3.create()
        @scale_vec = vec3.create()
        @r_diff = vec3.create()
        @t_diff = vec3.create()
        @s_diff = vec3.create()
        @inc_r_diff = vec3.create()
        @inc_t_diff = vec3.create()
        @inc_s_diff = vec3.create()
        @states = new Object()
        @states["default"] = new UTIL.geometry_state()

    regular_polygon: (vertices) ->
        for i in [0..vertices]
            angle = (2 * Math.PI) * (i / vertices)
            x = Math.sin(angle)
            y = Math.cos(angle)
            @add_vertex [x, y]

        this

    ###*
    * Adds two-dimensional vertex to list of vertices, with default z value of 0. All vertices
    * start with this z value, so that they are 'drawn flat'.
    ###
    add_vertex: (vertex) ->
        @vertices.push([vertex[0], vertex[1], 0])

    ###*
    * Transforms geometry back to its default state.
    ###
    reset_state: () ->
        @change_state("default")

    create_state: (state_name) ->
        @states[state_name] = @states["default"].copy()
        for i in [0...@children.length]
            @children[i].create_state(state_name)

    ###*
    * Transforms this gemoetry based on the three vectors contained in the given state. Rather
    * than perform the transformation immediately, it performs a bunch of incremental
    * transitions, so that it appears smooth.
    ###
    change_state: (state_name) ->
        state = @states[state_name]

        vec3.subtract(@r_diff, state.rotate_vec, @rotate_vec)
        vec3.subtract(@t_diff, state.translate_vec, @translate_vec)
        vec3.subtract(@s_diff, state.scale_vec, @scale_vec)

        vec3.scale(@inc_r_diff, @r_diff, 0.05)
        vec3.scale(@inc_t_diff, @t_diff, 0.05)
        vec3.scale(@inc_s_diff, @s_diff, 0.05)

        `
        for (i = 0; i < 20; i++) {
            (function(r, rd, t, td, s, sd) {
                setTimeout(function() {
                    vec3.add(r, r, rd);
                    vec3.add(t, t, td);
                    vec3.add(s, s, sd);
                }, 10 * i);
            }).call(this, this.rotate_vec, this.inc_r_diff, this.translate_vec, this.inc_t_diff, this.scale_vec, this.inc_s_diff);
        }
        `

        for i in [0...@children.length]
            @children[i].change_state(state_name)

    ###*
    * Multiplies this geometry's global matrix by its parent's global matrix. This ensures that
    * all of the parent geometry's transformations are corrently applied to this geometry.
    * @param {UTIL.geometry} parent geometry
    ###
    transform_by_parent: (parent) ->
        mat4.copy(@glob_matrix, parent.glob_matrix)
        mat4.multiply(@glob_matrix, @glob_matrix, @matrix)

    ###*
    * Sets current transformation matrix based on this geometry's global translation,
    * rotation, and scale vectors.
    ###
    render_prep: () ->
        mat4.identity(@matrix)

        if @translate_vec[0] != 0 or @translate_vec[1] != 0 or @translate_vec[2] != 0
            mat4.identity(@t)
            mat4.translate(@t, @t, @translate_vec)
            mat4.multiply(@matrix, @matrix, @t)

        if @rotate_vec[0] != 0
            mat4.identity(@t)
            mat4.rotateX(@t, @t, @rotate_vec[0])
            mat4.multiply(@matrix, @matrix, @t)

        if @rotate_vec[1] != 0
            mat4.identity(@t)
            mat4.rotateY(@t, @t, @rotate_vec[1])
            mat4.multiply(@matrix, @matrix, @t)

        if @rotate_vec[2] != 0
            mat4.identity(@t)
            mat4.rotateZ(@t, @t, @rotate_vec[2])
            mat4.multiply(@matrix, @matrix, @t)

        if @scale_vec[0] != 1 or @scale_vec[1] != 1 or @scale_vec[2] != 1
            mat4.identity(@t)
            mat4.scale(@t, @t, @scale_vec)
            mat4.multiply(@matrix, @matrix, @t)

    ###*
    * @return {boolean} true if this geometry contains any vertices, else false.
    ###
    has_vertex: () ->
        if @vertices.length == 0 then false else true

    ###*
    * Adds a given geometry to list of children.
    ###
    add: (child) ->
        @children.push child

    ###*
    * Finds and removes a given geometry from list of children.
    ###
    remove: (child) ->
        index = @children.indexOf child
        @children = @children.splice index, 1

    ###*
    * Absolute translation. Equivalant of resetting matrix and translating.
    ###
    set_translation: (x, y, z) ->
        vec3.set(@translate_vec, x, y, z)

    ###*
    * Incremental translation. Adds to current translation.
    ###
    translate: (x, y, z) ->
        @translate_vec[0] += x
        @translate_vec[1] += y
        @translate_vec[2] += z

    ###*
    * Absolute rotation. Equivalent of resetting matrix and rotating.
    ###
    set_rotation_x: (a) ->
        @rotate_vec[0] = a

    ###*
    * Incremental rotation. Adds to current rotation.
    ###
    rotate_x: (a) ->
        @rotate_vec[0] += a

    ###*
    * Absolute rotation. Equivalent of resetting matrix and rotating.
    ###
    set_rotation_y: (a) ->
        @rotate_vec[1] = a

    ###*
    * Incremental rotation. Adds to current rotation.
    ###
    rotate_y: (a) ->
        @rotate_vec[1] += a

    ###*
    * Absolute rotation. Equivalent of resetting matrix and rotating.
    ###
    set_rotation_z: (a) ->
        @rotate_vec[2] = a

    ###*
    * Incremental rotation. Adds to current rotation.
    ###
    rotate_z: (a) ->
        @rotate_vec[2] += a

    ###*
    * Incremental scale. Multiplies to current scale.
    ###
    scale: (x, y, z) ->
        @scale_vec[0] *= x
        @scale_vec[1] *= y
        @scale_vec[2] *= z

    ###*
    * Absolute scale. Equivalent of resetting matrix and scaling.
    ###
    set_scale: (x, y, z) ->
        @scale_vec[0] = x
        @scale_vec[1] = y
        @scale_vec[2] = z
*/

  renderer: function(g1, w, h, g2) {
    this.g1 = g1;
    this.g2 = g2;
    this.g = g1;
    this.eyeSeparation = 1;
    this.w = w;
    this.h = h;
    this.world = new UTIL.geometry();
    this.FL = 4;
    this.point0 = vec3.create();
    this.point1 = vec3.create();
    this.a = vec2.create();
    this.b = vec2.create();
    this.temp = vec4.create();
    this.t = mat4.create();
    this.frame = 0;

    this.renderWorld = function() {
      this.renderGeometry(this.world);

      if (typeof this.g2 !== "undefined") {
        this.g = this.g2;
        this.translate(-this.eyeSeparation, 0, 0);

        this.renderGeometry(this.world);

        this.g = g1;
        this.translate(this.eyeSeparation, 0, 0);
      }

      this.frame += 1;
    }

    this.renderGeometry = function(geo) {
      if (geo instanceof UTIL.geometry) {
        this.render3d(geo);
      } else if (geo instanceof UTIL.geometry2d) {
        geo.renderPrep();
        this.render2d(geo);
      }
    }

    /* TODO: port this.
    render_2d: (geo) ->
      if geo.has_vertex()
        for i in [1...geo.vertices.length]
          @transform geo.glob_matrix, geo.vertices[i - 1], @point0
          @transform geo.glob_matrix, geo.vertices[i], @point1

          @project_point @point0, @a
          @project_point @point1, @b

          @draw_line(@a, @b)

      for child in geo.children
        child.transform_by_parent(geo)
        @render_geometry(child)
    */

    this.render3d = function(geo) {
      if (geo.hasVertex()) {
        for (var f = 0; f < geo.faces.length; f++) {
          for (var e = 0; e < geo.faces[f].length() - 1; e++) {
            var i = geo.faces[f].vertices[e];
            var j = geo.faces[f].vertices[e + 1];

            this.transform(geo.globMatrix, geo.vertices[i].coordinates, this.point0);
            this.transform(geo.globMatrix, geo.vertices[j].coordinates, this.point1);

            this.projectPoint(this.point0, this.a);
            this.projectPoint(this.point1, this.b);

            this.drawLine(this.a, this.b);
          }

          var i = geo.faces[f].vertices[geo.faces[f].length() - 1];
          var j = geo.faces[f].vertices[0];

          this.transform(geo.globMatrix, geo.vertices[i].coordinates, this.point0);
          this.transform(geo.globMatrix, geo.vertices[j].coordinates, this.point1);

          this.projectPoint(this.point0, this.a);
          this.projectPoint(this.point1, this.b);

          this.drawLine(this.a, this.b);
        }
      }

      for (var i = 0; i < geo.children.length; i++) {
        var child = geo.children[i];
        child.transformByParent(geo);
        this.renderGeometry(child);
      }
    }

    this.transform = function(mat, src, dst) {
      if (src.length != dst.length) {
        console.log("not able to transform point due to dimension error.");
      } else {
        for (var i = 0; i < src.length; i++) {
          this.temp[i] = src[i];
        }
        this.temp[src.length] = 1;

        for (var i = 0; i < dst.length; i++) {
          var replacement = 0.0;
          for (var j = 0; j < this.temp.length; j++) {
            replacement += this.temp[j] * mat[i + (4 * j)];
          }
          dst[i] = replacement;
        }
      }
    }

    this.subPoints = function(lastPoint, point) {
      var length = vec2.distance(lastPoint, point);

      var allPoints;
      if (length < 1000) { // this branch is essentially forced
        allPoints = [];
        allPoints.push(point);
      } else {
        var mid = [(point[0] + lastPoint[0]) / 2, (point[1] + lastPoint[1]) / 2];
        var low = this.subPoints(lastPoint, mid);
        var high = this.subPoints(mid, point);
        allPoints = low.concat(high);
      }

      return allPoints;
    }

    this.drawLine = function(p1, p2) {
      this.g.moveTo(p1[0] + this.noise(), p1[1] + this.noise());

      var interPoints = this.subPoints(p1, p2);

      for (var i = 0; i < interPoints.length; i++) {
        this.g.lineTo(interPoints[i][0] + this.noise(), interPoints[i][1] + this.noise());
      }
    }

    this.projectPoint = function(xyz, pxy) {
      var x = xyz[0];
      var y = xyz[1];
      var z = xyz[2];

      pxy[0] = this.w / 2 + (this.h * x / (this.FL - z));
      pxy[1] = this.h / 2 + (this.h * y / (this.FL - z));
    }

    this.noise = function() {
      return (Math.random() - 0.5) * 10;
    }

    this.translate = function(x, y, z) {
      mat4.identity(this.t);
      mat4.translate(this.t, this.t, [x, y, z]);
      mat4.multiply(this.world.globMatrix, this.world.globMatrix, this.t);
    }

    this.rotateX = function(a) {
      mat4.identity(this.t);
      mat4.rotateX(this.t, this.t, a);
      mat4.multiply(this.world.globMatrix, this.world.globMatrix, this.t);
    }

    this.rotateY = function(a) {
      mat4.identity(this.t);
      mat4.rotateY(this.t, this.t, a);
      mat4.multiply(this.world.globMatrix, this.world.globMatrix, this.t);
    }

    this.rotateZ = function(a) {
      mat4.identity(this.t);
      mat4.rotateZ(this.t, this.t, a);
      mat4.multiply(this.world.globMatrix, this.world.globMatrix, this.t);
    }

    this.scale = function(x, y, z) {
      mat4.identity(this.t);
      mat4.scale(this.t, this.t, [x, y, z]);
      mat4.multiply(this.world.globMatrix, this.world.globMatrix, this.t);
    }
  },
};
